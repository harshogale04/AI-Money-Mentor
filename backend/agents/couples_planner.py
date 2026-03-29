from agents.base import BaseAgent
from models.schemas import CoupleProfile
from tools.tax_calculator import analyze_tax, TaxProfile, Deductions
import json


SYSTEM_PROMPT = """You are India's best joint financial planning advisor for couples.
Given both partners' complete financial profiles, optimize across both incomes.
Return structured JSON with keys:
- hra_recommendation: { partner, monthly_saving }
- nps_recommendation: { partner_a_contribution, partner_b_contribution, total_tax_saving }
- sip_split: { partner_a_sips, partner_b_sips, rationale }
- insurance_strategy: { type, cover_amounts, rationale }
- combined_net_worth: { current, projected_5yr, projected_10yr }
- tax_saving_summary: { total_annual_saving }
- priority_actions: list of 5 immediate steps"""


class CouplesAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.agent_name = "couples_planner"

    async def run(self, couple_profile: CoupleProfile) -> dict:
        if not couple_profile.both_ready or not couple_profile.partner_b_id:
            return {
                "status": "waiting",
                "message": "Waiting for both partners to complete their profiles.",
                "partner_a_ready": bool(couple_profile.partner_a_id),
                "partner_b_ready": bool(couple_profile.partner_b_id),
            }

        # Safely fetch both profiles
        try:
            a_res = self.db.table("user_profiles").select("*").eq("user_id", couple_profile.partner_a_id).execute()
            b_res = self.db.table("user_profiles").select("*").eq("user_id", couple_profile.partner_b_id).execute()
        except Exception:
            return {"status": "error", "message": "Could not connect to database."}

        if not a_res.data or not b_res.data:
            return {"status": "error", "message": "Could not fetch partner profiles."}

        a = a_res.data[0]
        b = b_res.data[0]

        combined_income = a["annual_income"] + b["annual_income"]
        combined_expenses = a["monthly_expenses"] + b["monthly_expenses"]
        hra_rec = self._optimize_hra(a, b)
        nps_rec = self._optimize_nps(a, b)
        tax_a = self._quick_tax(a)
        tax_b = self._quick_tax(b)
        net_worth = self._compute_net_worth(a, b)

        joint_data = {
            "partner_a": {
                "name": a["name"], "age": a["age"],
                "annual_income": a["annual_income"],
                "monthly_expenses": a["monthly_expenses"],
                "risk_profile": a["risk_profile"],
                "tax_regime": a["tax_regime"],
                "existing_investments": a.get("existing_investments", 0),
                "goals": a.get("goals", []),
                "computed_tax": tax_a,
            },
            "partner_b": {
                "name": b["name"], "age": b["age"],
                "annual_income": b["annual_income"],
                "monthly_expenses": b["monthly_expenses"],
                "risk_profile": b["risk_profile"],
                "tax_regime": b["tax_regime"],
                "existing_investments": b.get("existing_investments", 0),
                "goals": b.get("goals", []),
                "computed_tax": tax_b,
            },
            "combined_income": combined_income,
            "combined_expenses": combined_expenses,
            "shared_goals": couple_profile.shared_goals,
            "hra_optimization": hra_rec,
            "nps_recommendation": nps_rec,
            "combined_net_worth": net_worth,
        }

        ai_plan = await self._call_llm(
            SYSTEM_PROMPT,
            f"Joint financial profile:\n{json.dumps(joint_data, indent=2)}"
        )

        # Safe persist
        try:
            self.db.table("couple_profiles").upsert({
                "couple_id": couple_profile.couple_id,
                "partner_a_id": couple_profile.partner_a_id,
                "partner_b_id": couple_profile.partner_b_id,
                "combined_income": combined_income,
                "combined_expenses": combined_expenses,
                "shared_goals": [g.model_dump() for g in couple_profile.shared_goals],
                "hra_optimization": hra_rec,
                "nps_split": nps_rec,
                "both_ready": True,
            }).execute()
        except Exception:
            pass

        return {
            "status": "complete",
            "joint_summary": joint_data,
            "ai_plan": ai_plan,
        }

    def _optimize_hra(self, a: dict, b: dict) -> dict:
        a_hra = a["annual_income"] * 0.40
        b_hra = b["annual_income"] * 0.40
        if a_hra >= b_hra:
            return {"claim_partner": a["name"], "estimated_annual_saving": round(a_hra * 0.30, 0)}
        return {"claim_partner": b["name"], "estimated_annual_saving": round(b_hra * 0.30, 0)}

    def _optimize_nps(self, a: dict, b: dict) -> dict:
        nps_per_partner = 50_000
        a_saving = nps_per_partner * (0.30 if a["annual_income"] > 1_000_000 else 0.20)
        b_saving = nps_per_partner * (0.30 if b["annual_income"] > 1_000_000 else 0.20)
        return {
            "partner_a_contribution": nps_per_partner,
            "partner_b_contribution": nps_per_partner,
            "partner_a_tax_saving": round(a_saving, 0),
            "partner_b_tax_saving": round(b_saving, 0),
            "total_tax_saving": round(a_saving + b_saving, 0),
        }

    def _quick_tax(self, profile: dict) -> dict:
        tp = TaxProfile(
            gross_salary=profile["annual_income"],
            deductions=Deductions(standard_deduction=50_000),
        )
        result = analyze_tax(tp)
        return {
            "old_regime": result.tax_old_regime,
            "new_regime": result.tax_new_regime,
            "recommended": result.recommended_regime,
        }

    def _compute_net_worth(self, a: dict, b: dict) -> dict:
        current = (a.get("existing_investments", 0) or 0) + (b.get("existing_investments", 0) or 0)
        r = 0.12
        return {
            "current": current,
            "projected_5yr": round(current * ((1 + r) ** 5), 0),
            "projected_10yr": round(current * ((1 + r) ** 10), 0),
        }