from agents.base import BaseAgent
from models.schemas import TaxProfile
from tools.tax_calculator import analyze_tax, DEDUCTION_LIMITS
import json


SYSTEM_PROMPT = """You are an expert Indian tax advisor for salaried individuals (FY 2024-25).
Analyze the given tax profile and return a JSON object with EXACTLY these keys:

{
  "regime_recommendation": "plain text explanation of which regime to choose and why",
  "recommended_regime": "old or new",
  "tax_saving": "INR amount saved by choosing the better regime as a plain string",
  "missing_deductions": [
    {
      "section": "section name e.g. 80C",
      "description": "what investments qualify",
      "amount_available": "INR amount still available as a plain string",
      "max_limit": "INR max limit as a plain string"
    }
  ],
  "investment_suggestions": [
    {
      "name": "investment name e.g. ELSS Mutual Fund",
      "reason": "one sentence why this is recommended",
      "max_deduction": "INR amount as plain string",
      "returns": "expected returns e.g. 12-15% p.a.",
      "liquidity": "lock-in period e.g. 3 years",
      "risk": "Low / Medium / High"
    }
  ],
  "summary": "2-3 sentence plain text summary of key tax advice"
}

All values must be plain strings or arrays of strings/objects. No nested objects. Use INR amounts."""


class TaxWizardAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.agent_name = "tax_wizard"

    async def run(self, tax_profile: TaxProfile) -> dict:
        analyzed = analyze_tax(tax_profile)
        missing = self._find_missing_deductions(analyzed)

        profile_data = {
            "gross_salary": analyzed.gross_salary,
            "deductions_claimed": analyzed.deductions.model_dump(),
            "tax_old_regime": analyzed.tax_old_regime,
            "tax_new_regime": analyzed.tax_new_regime,
            "recommended_regime": analyzed.recommended_regime,
            "potential_savings": analyzed.potential_savings,
            "missing_deduction_headroom": missing,
            "deduction_limits": DEDUCTION_LIMITS,
        }

        ai_advice = await self._call_llm(
            SYSTEM_PROMPT,
            f"Tax profile:\n{json.dumps(profile_data, indent=2)}"
        )

        # Safe persist
        try:
            if tax_profile.user_id:
                self.db.table("tax_profiles").insert({
                    "user_id": tax_profile.user_id,
                    "gross_salary": analyzed.gross_salary,
                    "hra_received": analyzed.hra_received,
                    "hra_exempt": analyzed.hra_exempt,
                    "deductions": analyzed.deductions.model_dump(),
                    "taxable_income_old": analyzed.taxable_income_old,
                    "taxable_income_new": analyzed.taxable_income_new,
                    "tax_old_regime": analyzed.tax_old_regime,
                    "tax_new_regime": analyzed.tax_new_regime,
                    "recommended_regime": analyzed.recommended_regime,
                    "potential_savings": analyzed.potential_savings,
                }).execute()
        except Exception:
            pass

        return {
            "tax_old_regime": analyzed.tax_old_regime,
            "tax_new_regime": analyzed.tax_new_regime,
            "recommended_regime": analyzed.recommended_regime,
            "potential_savings": analyzed.potential_savings,
            "missing_deductions": missing,
            "ai_advice": ai_advice,
        }

    def _find_missing_deductions(self, profile: TaxProfile) -> dict:
        d = profile.deductions
        return {
            "80C_unused": max(0, DEDUCTION_LIMITS["80C"] - d.section_80c),
            "80D_unused": max(0, DEDUCTION_LIMITS["80D_self"] - d.section_80d),
            "80CCD_unused": max(0, DEDUCTION_LIMITS["80CCD_1B"] - d.section_80ccd),
        }