from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


# ── Goals ────────────────────────────────────────────────────────────────────

class FinancialGoal(BaseModel):
    name: str                          # "Retire", "Buy house", "Child education"
    target_amount: float
    target_year: int
    priority: Literal["high", "medium", "low"] = "medium"


# ── User Profile ──────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    user_id: Optional[str] = None
    name: str
    age: int
    email: str
    annual_income: float               # INR
    monthly_expenses: float            # INR
    risk_profile: Literal["conservative", "moderate", "aggressive"] = "moderate"
    tax_regime: Literal["old", "new"] = "new"
    existing_investments: Optional[float] = 0.0   # total corpus INR
    goals: List[FinancialGoal] = []
    partner_id: Optional[str] = None
    created_at: Optional[datetime] = None


class UserProfileCreate(BaseModel):
    name: str
    age: int
    email: str
    annual_income: float
    monthly_expenses: float
    risk_profile: Literal["conservative", "moderate", "aggressive"] = "moderate"
    tax_regime: Literal["old", "new"] = "new"
    existing_investments: Optional[float] = 0.0
    goals: List[FinancialGoal] = []


# ── Couple Profile ────────────────────────────────────────────────────────────

class CoupleProfile(BaseModel):
    couple_id: Optional[str] = None
    partner_a_id: str
    partner_b_id: Optional[str] = None       # None until partner B joins
    combined_income: Optional[float] = None
    combined_expenses: Optional[float] = None
    shared_goals: List[FinancialGoal] = []
    hra_optimization: Optional[dict] = None  # { partner, amount }
    nps_split: Optional[dict] = None          # { a_amount, b_amount }
    insurance_strategy: Optional[Literal["joint", "individual"]] = None
    both_ready: bool = False


# ── MF Holdings ───────────────────────────────────────────────────────────────

class Transaction(BaseModel):
    date: str
    type: Literal["purchase", "redemption", "switch_in", "switch_out", "dividend"]
    amount: float
    units: float
    nav: float


class MFHolding(BaseModel):
    user_id: Optional[str] = None
    scheme_name: str
    isin: Optional[str] = None
    amc: Optional[str] = None
    category: Optional[str] = None          # Large Cap, Mid Cap, etc.
    units: float
    avg_nav: float
    current_nav: Optional[float] = None
    current_value: Optional[float] = None
    xirr: Optional[float] = None
    expense_ratio: Optional[float] = None
    benchmark: Optional[str] = None
    transactions: List[Transaction] = []


class MFPortfolio(BaseModel):
    user_id: str
    holdings: List[MFHolding]
    total_invested: float
    total_current_value: Optional[float] = None
    overall_xirr: Optional[float] = None
    parsed_at: Optional[datetime] = None


# ── Tax Profile ───────────────────────────────────────────────────────────────

class Deductions(BaseModel):
    section_80c: float = 0.0      # ELSS, PPF, LIC, etc.
    section_80d: float = 0.0      # Health insurance
    section_80ccd: float = 0.0    # NPS
    hra_exemption: float = 0.0
    standard_deduction: float = 50000.0
    other: float = 0.0


class TaxProfile(BaseModel):
    user_id: Optional[str] = None
    financial_year: str = "2024-25"
    gross_salary: float
    hra_received: float = 0.0
    hra_exempt: float = 0.0
    deductions: Deductions = Deductions()
    taxable_income_old: Optional[float] = None
    taxable_income_new: Optional[float] = None
    tax_old_regime: Optional[float] = None
    tax_new_regime: Optional[float] = None
    recommended_regime: Optional[Literal["old", "new"]] = None
    potential_savings: Optional[float] = None


# ── Health Score ──────────────────────────────────────────────────────────────

class HealthScoreInput(BaseModel):
    user_id: Optional[str] = None
    monthly_income: float
    monthly_expenses: float
    emergency_fund: float              # months of expenses saved
    insurance_cover: float             # total life + health cover INR
    total_debt_emi: float              # monthly EMI outflow
    investment_types: List[str] = []   # ["equity", "debt", "gold", "fd"]
    retirement_corpus: float = 0.0
    age: int


class HealthScoreResult(BaseModel):
    emergency_score: float
    insurance_score: float
    diversification_score: float
    debt_score: float
    tax_score: float
    retirement_score: float
    overall_score: float
    priority_actions: List[str] = []


# ── FIRE ──────────────────────────────────────────────────────────────────────

class FIREInput(BaseModel):
    user_profile: UserProfile
    target_retirement_age: int
    expected_return_rate: float = 12.0     # % p.a.
    inflation_rate: float = 6.0            # % p.a.
    post_retirement_monthly_expense: float


# ── Life Event ────────────────────────────────────────────────────────────────

class LifeEventInput(BaseModel):
    user_id: str
    event_type: Literal["bonus", "inheritance", "marriage", "new_baby", "job_change", "property_purchase"]
    event_amount: Optional[float] = None   # bonus amount, inheritance amount etc.
    additional_context: Optional[str] = None


# ── API Response wrappers ─────────────────────────────────────────────────────

class AgentResponse(BaseModel):
    success: bool
    agent: str
    data: Optional[dict] = None
    message: Optional[str] = None
    error: Optional[str] = None
