from models.schemas import TaxProfile, Deductions


# ── Tax slabs FY 2024-25 ──────────────────────────────────────────────────────

OLD_SLABS = [
    (250_000, 0.00),
    (500_000, 0.05),
    (1_000_000, 0.20),
    (float("inf"), 0.30),
]

NEW_SLABS = [
    (300_000, 0.00),
    (600_000, 0.05),
    (900_000, 0.10),
    (1_200_000, 0.15),
    (1_500_000, 0.20),
    (float("inf"), 0.30),
]


def _slab_tax(income: float, slabs: list) -> float:
    tax = 0.0
    prev = 0.0
    for limit, rate in slabs:
        if income <= prev:
            break
        taxable = min(income, limit) - prev
        tax += taxable * rate
        prev = limit
    return tax


def _add_cess(tax: float) -> float:
    return tax * 1.04   # 4% health + education cess


def _rebate_87a(tax: float, taxable_income: float, regime: str) -> float:
    """Rebate u/s 87A — zero tax if income ≤ 5L (old) or 7L (new)."""
    threshold = 700_000 if regime == "new" else 500_000
    if taxable_income <= threshold:
        return 0.0
    return tax


def compute_old_regime(profile: TaxProfile) -> float:
    d = profile.deductions
    deduction_total = (
        d.section_80c +
        d.section_80d +
        d.section_80ccd +
        d.hra_exemption +
        d.standard_deduction +
        d.other
    )
    taxable = max(0, profile.gross_salary - deduction_total)
    profile.taxable_income_old = taxable
    tax = _slab_tax(taxable, OLD_SLABS)
    tax = _rebate_87a(tax, taxable, "old")
    return round(_add_cess(tax), 2)


def compute_new_regime(profile: TaxProfile) -> float:
    # New regime: only standard deduction of ₹75,000 from FY 2024-25
    standard_ded = 75_000
    taxable = max(0, profile.gross_salary - standard_ded)
    profile.taxable_income_new = taxable
    tax = _slab_tax(taxable, NEW_SLABS)
    tax = _rebate_87a(tax, taxable, "new")
    return round(_add_cess(tax), 2)


def analyze_tax(profile: TaxProfile) -> TaxProfile:
    """Fill in both regime taxes and recommend the better one."""
    profile.tax_old_regime = compute_old_regime(profile)
    profile.tax_new_regime = compute_new_regime(profile)
    if profile.tax_new_regime <= profile.tax_old_regime:
        profile.recommended_regime = "new"
        profile.potential_savings = round(profile.tax_old_regime - profile.tax_new_regime, 2)
    else:
        profile.recommended_regime = "old"
        profile.potential_savings = round(profile.tax_new_regime - profile.tax_old_regime, 2)
    return profile


def hra_exemption(basic: float, hra_received: float, rent_paid: float, metro: bool) -> float:
    """Calculate HRA exemption — minimum of three conditions."""
    actual_hra = hra_received
    rent_minus_10 = max(0, rent_paid - 0.10 * basic)
    hra_limit = 0.50 * basic if metro else 0.40 * basic
    return round(min(actual_hra, rent_minus_10, hra_limit), 2)


DEDUCTION_LIMITS = {
    "80C": 150_000,
    "80D_self": 25_000,
    "80D_parents": 50_000,    # senior citizen parents
    "80CCD_1B": 50_000,       # additional NPS
    "80TTA": 10_000,           # savings interest
}
