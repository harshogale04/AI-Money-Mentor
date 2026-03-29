from agents.base import BaseAgent
from models.schemas import MFPortfolio, MFHolding
from tools.xirr import compute_portfolio_xirr, xirr
from typing import List
from datetime import date
import json


SYSTEM_PROMPT = """You are an expert mutual fund analyst for Indian investors.
Analyze the given portfolio and return a JSON object with EXACTLY these keys:

{
  "overall_assessment": "2-3 sentence plain text summary of portfolio quality",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "fund_overlap": "plain text description of any overlap between funds",
  "expense_ratio_analysis": "plain text about expense ratios and annual cost drag",
  "benchmark_comparison": "plain text comparing to Nifty 50 / category benchmarks",
  "rebalancing_plan": [
    {
      "action": "EXIT or CONTINUE or INTRODUCE or CONSOLIDATE",
      "fund": "fund name",
      "reason": "one sentence reason",
      "suggested_fund": "alternative fund name if applicable"
    }
  ],
  "proposed_allocation": [
    {
      "scheme": "fund name",
      "category": "category",
      "percentage": "40%",
      "amount": "INR 2,00,000"
    }
  ]
}

All values must be plain strings or arrays of strings/objects. No nested objects inside string fields. Use INR amounts."""


class MFXRayAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.agent_name = "mf_xray"

    async def run(self, portfolio: MFPortfolio) -> dict:
        # Step 1: Compute XIRR per holding
        for holding in portfolio.holdings:
            cashflows = []
            for t in holding.transactions:
                txn_date = date.fromisoformat(t.date)
                if t.type in ("purchase", "switch_in"):
                    cashflows.append((txn_date, -abs(t.amount)))
                else:
                    cashflows.append((txn_date, abs(t.amount)))
            if holding.current_value:
                cashflows.append((date.today(), holding.current_value))
            if cashflows:
                holding.xirr = round(xirr(sorted(cashflows)) * 100, 2)

        # Step 2: Portfolio-level XIRR
        portfolio.overall_xirr = round(compute_portfolio_xirr(portfolio.holdings) * 100, 2)

        # Step 3: Overlap detection (by category)
        overlap_groups = self._detect_overlap(portfolio.holdings)

        # Step 4: Expense drag
        expense_drag = self._compute_expense_drag(portfolio)

        # Step 5: Ask Gemini
        portfolio_summary = {
            "total_invested": portfolio.total_invested,
            "total_current_value": portfolio.total_current_value,
            "overall_xirr": portfolio.overall_xirr,
            "holdings": [
                {
                    "scheme": h.scheme_name,
                    "category": h.category,
                    "amc": h.amc,
                    "current_value": h.current_value,
                    "xirr": h.xirr,
                    "expense_ratio": h.expense_ratio,
                    "units": h.units,
                    "current_nav": h.current_nav,
                }
                for h in portfolio.holdings
            ],
            "overlap_groups": overlap_groups,
            "expense_drag_per_year": expense_drag,
        }

        ai_analysis = await self._call_llm(
            SYSTEM_PROMPT,
            f"Analyze this Indian mutual fund portfolio:\n{json.dumps(portfolio_summary, indent=2)}"
        )

        # Step 6: Safe persist
        try:
            self.db.table("mf_portfolios").insert({
                "user_id": portfolio.user_id,
                "holdings": [h.model_dump() for h in portfolio.holdings],
                "total_invested": portfolio.total_invested,
                "total_current_value": portfolio.total_current_value,
                "overall_xirr": portfolio.overall_xirr,
            }).execute()
        except Exception:
            pass

        return {
            "portfolio_summary": portfolio_summary,
            "ai_analysis": ai_analysis,
            "overlap_groups": overlap_groups,
            "expense_drag_per_year": expense_drag,
        }

    def _detect_overlap(self, holdings: List[MFHolding]) -> dict:
        category_map: dict = {}
        for h in holdings:
            cat = h.category or "Unknown"
            category_map.setdefault(cat, []).append(h.scheme_name)
        return {k: v for k, v in category_map.items() if len(v) > 1}

    def _compute_expense_drag(self, portfolio: MFPortfolio) -> float:
        drag = 0.0
        for h in portfolio.holdings:
            if h.expense_ratio and h.current_value:
                drag += (h.expense_ratio / 100) * h.current_value
        return round(drag, 2)