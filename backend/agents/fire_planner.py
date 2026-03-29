from agents.base import BaseAgent
from models.schemas import FIREInput
import json
import math


SYSTEM_PROMPT = """You are an expert FIRE (Financial Independence, Retire Early) planner for Indian investors.
Given the user's financial data and computed FIRE numbers, build a complete month-by-month financial roadmap.
Include: SIP amounts per goal, asset allocation shifts by age, insurance gaps, tax-saving moves, emergency fund targets.
Be specific with INR amounts. Return structured JSON with keys:
fire_corpus_needed, years_to_fire, monthly_sip_needed, goal_wise_sips, asset_allocation, insurance_gap, tax_moves, milestones."""


class FIREAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.agent_name = "fire_planner"

    async def run(self, data: FIREInput) -> dict:
        profile = data.user_profile
        years = data.target_retirement_age - profile.age
        r = data.expected_return_rate / 100 / 12   # monthly rate
        n = years * 12                               # months

        # Step 1: Corpus needed (inflation-adjusted)
        monthly_expense_at_retirement = data.post_retirement_monthly_expense * (
            (1 + data.inflation_rate / 100) ** years
        )
        # 4% safe withdrawal rate → corpus = annual_expense / 0.04
        annual_expense_retirement = monthly_expense_at_retirement * 12
        corpus_needed = annual_expense_retirement / 0.04

        # Step 2: Monthly SIP needed (PMT formula)
        existing = profile.existing_investments or 0.0
        future_value_existing = existing * ((1 + r) ** n)
        remaining_corpus = max(0, corpus_needed - future_value_existing)

        if r > 0 and n > 0:
            sip_needed = remaining_corpus * r / (((1 + r) ** n) - 1)
        else:
            sip_needed = remaining_corpus / n if n > 0 else 0

        # Step 3: Asset allocation by age (100 - age rule + FIRE adjustment)
        equity_pct = max(30, min(80, 110 - profile.age))
        debt_pct = 100 - equity_pct

        # Step 4: Goal-wise SIP breakdown
        goal_sips = []
        for goal in profile.goals:
            goal_years = goal.target_year - 2025
            goal_n = goal_years * 12
            goal_r = r
            if goal_r > 0 and goal_n > 0:
                goal_sip = goal.target_amount * goal_r / (((1 + goal_r) ** goal_n) - 1)
            else:
                goal_sip = goal.target_amount / goal_n if goal_n > 0 else 0
            goal_sips.append({
                "goal": goal.name,
                "target_amount": goal.target_amount,
                "target_year": goal.target_year,
                "monthly_sip": round(goal_sip, 0),
            })

        fire_data = {
            "age": profile.age,
            "target_retirement_age": data.target_retirement_age,
            "years_to_fire": years,
            "corpus_needed": round(corpus_needed, 0),
            "existing_investments": existing,
            "monthly_sip_needed": round(sip_needed, 0),
            "monthly_income": profile.annual_income / 12,
            "monthly_expenses": profile.monthly_expenses,
            "sip_to_income_ratio": round((sip_needed / (profile.annual_income / 12)) * 100, 1),
            "asset_allocation": {"equity": equity_pct, "debt": debt_pct},
            "goal_wise_sips": goal_sips,
            "inflation_rate": data.inflation_rate,
            "expected_return": data.expected_return_rate,
            "post_retirement_monthly_expense": round(monthly_expense_at_retirement, 0),
        }

        # Step 5: Gemini builds the full roadmap
        roadmap = await self._call_llm(
            SYSTEM_PROMPT,
            f"FIRE calculation data:\n{json.dumps(fire_data, indent=2)}"
        )

        return {
            "fire_numbers": fire_data,
            "roadmap": roadmap,
        }
