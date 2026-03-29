from agents.base import BaseAgent
from models.schemas import HealthScoreInput, HealthScoreResult
import json
import uuid


SYSTEM_PROMPT = """You are a financial wellness coach for Indian investors.
Given a user's financial health scores across 6 dimensions (0-100 each),
provide a clear, actionable priority list of 3-5 specific steps they should take immediately.
Be direct, specific with INR amounts and timelines. Return JSON with key: priority_actions (list of strings)."""


class HealthScoreAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.agent_name = "health_score"

    async def run(self, data: HealthScoreInput) -> dict:
        scores = self._compute_scores(data)

        weights = {
            "emergency": 0.25,
            "insurance": 0.20,
            "diversification": 0.15,
            "debt": 0.20,
            "tax": 0.10,
            "retirement": 0.10,
        }

        overall = round(sum(
            getattr(scores, f"{k}_score") * v for k, v in weights.items()
        ), 1)
        scores.overall_score = overall

        score_data = {**scores.model_dump(), "age": data.age, "monthly_income": data.monthly_income}
        ai_response = await self._call_llm(
            SYSTEM_PROMPT,
            f"Financial health scores:\n{json.dumps(score_data, indent=2)}"
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                scores.priority_actions = parsed.get("priority_actions", [])
        except Exception:
            scores.priority_actions = ["Review your financial health with a certified advisor."]

        # SAFE PERSIST — skip DB save if no valid user_id
        user_id = data.user_id
        if user_id:
            try:
                uuid.UUID(str(user_id))
                # Only save health score — don't try to create user profile
                try:
                    self.db.table("health_scores").insert({
                        "user_id": user_id,
                        **scores.model_dump(),
                    }).execute()
                except Exception:
                    pass  # Don't crash if user doesn't exist in DB
            except Exception:
                pass  # Invalid UUID — skip DB entirely

        return scores.model_dump()

    def _compute_scores(self, data: HealthScoreInput) -> HealthScoreResult:
        emergency_months = data.emergency_fund / data.monthly_expenses if data.monthly_expenses else 0
        emergency_score = min(100, (emergency_months / 6) * 100)

        annual_income = data.monthly_income * 12
        insurance_score = min(100, (data.insurance_cover / (annual_income * 10)) * 100)

        asset_score_map = {"equity": 30, "debt": 25, "gold": 15, "fd": 15, "real_estate": 15}
        div_score = sum(asset_score_map.get(a, 5) for a in data.investment_types)
        diversification_score = min(100, div_score)

        emi_ratio = data.total_debt_emi / data.monthly_income if data.monthly_income else 1
        debt_score = max(0, 100 - (emi_ratio / 0.40) * 100) if emi_ratio < 0.40 else 0

        tax_instruments = {"elss", "ppf", "nps", "fd"}
        has_tax_saving = bool(tax_instruments.intersection(set(data.investment_types)))
        tax_score = 70.0 if has_tax_saving else 30.0

        annual_expenses = data.monthly_expenses * 12
        target_corpus = annual_expenses * 25
        retirement_score = min(100, (data.retirement_corpus / target_corpus) * 100)

        return HealthScoreResult(
            emergency_score=round(emergency_score, 1),
            insurance_score=round(insurance_score, 1),
            diversification_score=round(diversification_score, 1),
            debt_score=round(debt_score, 1),
            tax_score=round(tax_score, 1),
            retirement_score=round(retirement_score, 1),
            overall_score=0.0,
        )