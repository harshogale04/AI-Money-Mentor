from agents.base import BaseAgent
from models.schemas import LifeEventInput
import json


EVENT_PROMPTS = {
    "bonus": "The user received a bonus. Advise on optimal deployment: pre-payment vs investment vs tax-saving vs emergency fund. Consider their tax bracket.",
    "inheritance": "The user received an inheritance. Advise on wealth structuring, tax implications, investment strategy, and estate planning basics.",
    "marriage": "The user is getting married. Advise on joint finances, insurance needs, goal alignment, HRA optimization, and emergency fund top-up.",
    "new_baby": "The user has a new baby. Advise on child education fund (SIP in equity), term insurance increase, health insurance rider, and budget adjustments.",
    "job_change": "The user changed jobs. Advise on PF transfer/withdrawal decision, salary hike deployment, ESOPs if any, and updated SIP amounts.",
    "property_purchase": "The user is buying property. Advise on home loan vs rent analysis, down payment source, tax benefits (80C + 24B), and portfolio rebalancing.",
}

SYSTEM_PROMPT = """You are a personal financial advisor for Indian investors handling a specific life event.
Given the user's profile and event context, provide highly personalized, actionable advice.
Return structured JSON with keys: immediate_actions (list), short_term_plan (3-6 months), long_term_impact, tax_implications, risk_considerations."""


class LifeEventAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.agent_name = "life_event"

    async def run(self, data: LifeEventInput) -> dict:
        # Safely fetch user profile — don't crash if user doesn't exist
        profile = {}
        try:
            profile_res = self.db.table("user_profiles").select("*").eq("user_id", data.user_id).execute()
            profile = profile_res.data[0] if profile_res.data else {}
        except Exception:
            pass

        event_context = EVENT_PROMPTS.get(data.event_type, "General financial life event.")

        # Fix the f-string bug that was in original code
        event_amount_str = f"₹{data.event_amount:,.0f}" if data.event_amount else "Not specified"

        user_message = f"""
Event type: {data.event_type}
Event amount: {event_amount_str}
Additional context: {data.additional_context or 'None'}

User profile:
- Age: {profile.get('age', 'Unknown')}
- Annual income: ₹{profile.get('annual_income', 0):,.0f}
- Risk profile: {profile.get('risk_profile', 'moderate')}
- Tax regime: {profile.get('tax_regime', 'new')}
- Monthly expenses: ₹{profile.get('monthly_expenses', 0):,.0f}
- Goals: {json.dumps(profile.get('goals', []))}

Event guidance: {event_context}
"""
        advice = await self._call_llm(SYSTEM_PROMPT, user_message)

        return {
            "event_type": data.event_type,
            "event_amount": data.event_amount,
            "advice": advice,
            "user_profile_snapshot": profile,
        }