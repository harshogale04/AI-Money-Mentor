from scipy.optimize import brentq
from datetime import date
from typing import List, Tuple


def xirr(cashflows: List[Tuple[date, float]]) -> float:
    """
    Compute XIRR given a list of (date, amount) cashflows.
    Negative amounts = investments (outflows).
    Positive amounts = redemptions / current value (inflows).
    """
    if not cashflows:
        return 0.0

    dates, amounts = zip(*cashflows)
    base_date = dates[0]
    days = [(d - base_date).days for d in dates]

    def npv(rate: float) -> float:
        return sum(a / (1 + rate) ** (d / 365.0) for a, d in zip(amounts, days))

    try:
        return brentq(npv, -0.9999, 100.0, maxiter=1000)
    except ValueError:
        return 0.0


def compute_portfolio_xirr(holdings) -> float:
    """Aggregate XIRR across all holdings in a portfolio."""
    all_cashflows: List[Tuple[date, float]] = []

    for holding in holdings:
        for txn in holding.transactions:
            txn_date = date.fromisoformat(txn.date)
            if txn.type in ("purchase", "switch_in"):
                all_cashflows.append((txn_date, -abs(txn.amount)))
            elif txn.type in ("redemption", "switch_out"):
                all_cashflows.append((txn_date, abs(txn.amount)))

        # Current value as final inflow at today's date
        if holding.current_value:
            all_cashflows.append((date.today(), holding.current_value))

    all_cashflows.sort(key=lambda x: x[0])
    return xirr(all_cashflows)
