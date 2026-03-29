import re
import pdfplumber
from typing import List, Optional
from models.schemas import MFHolding, Transaction, TaxProfile, Deductions
from datetime import datetime
import io


# ── MF Statement Parser (CAMS) ────────────────────────────────────────────────

def parse_cams_pdf(file_bytes: bytes) -> List[MFHolding]:
    holdings: List[MFHolding] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    lines = [l.strip() for l in full_text.split("\n") if l.strip()]

    current: Optional[dict] = None

    for i, line in enumerate(lines):

        # ── Detect scheme name ────────────────────────────────────────────
        # Matches lines like "Axis Bluechip Fund - Growth"
        if re.search(r"Fund\s*[-–]\s*(Growth|Dividend|IDCW)", line, re.IGNORECASE):
            if current:
                holdings.append(_build_holding(current))
            current = {
                "scheme_name": line.strip(),
                "category": None,
                "amc": None,
                "expense_ratio": None,
                "units": 0.0,
                "avg_nav": 0.0,
                "current_nav": 0.0,
                "current_value": 0.0,
                "xirr": None,
                "transactions": [],
            }
            continue

        if current is None:
            continue

        # ── AMC and Category ──────────────────────────────────────────────
        # "Folio No: 1234567/89 AMC: Axis Mutual Fund"
        amc_match = re.search(r"AMC:\s*(.+?)(?:\s{2,}|$)", line)
        if amc_match:
            current["amc"] = amc_match.group(1).strip()

        # "Category: Large Cap Expense Ratio: 1.60%"
        cat_match = re.search(r"Category:\s*([A-Za-z &]+?)(?:\s{2,}|Expense|$)", line)
        if cat_match:
            current["category"] = cat_match.group(1).strip()

        exp_match = re.search(r"Expense Ratio:\s*([\d.]+)%", line)
        if exp_match:
            current["expense_ratio"] = float(exp_match.group(1))

        # ── Transaction line ──────────────────────────────────────────────
        # "10-Jan-2021 Purchase (Lumpsum) Rs. 1,00,000.00 600.000 166.67 600.000"
        txn_match = re.match(
            r"(\d{2}-[A-Za-z]{3}-\d{4})\s+"      # date
            r"(.+?)\s+"                             # description
            r"Rs\.\s*([\d,]+\.?\d*)\s+"            # amount
            r"([\d,]+\.?\d*)\s+"                   # units
            r"([\d,]+\.?\d*)\s+"                   # nav
            r"([\d,]+\.?\d*)",                     # closing balance
            line
        )
        if txn_match:
            date_str, desc, amount, units, nav, _ = txn_match.groups()
            try:
                txn_date = datetime.strptime(date_str, "%d-%b-%Y").strftime("%Y-%m-%d")
                txn_type = _classify_transaction(desc)
                current["transactions"].append(Transaction(
                    date=txn_date,
                    type=txn_type,
                    amount=float(amount.replace(",", "")),
                    units=float(units.replace(",", "")),
                    nav=float(nav.replace(",", "")),
                ))
            except Exception:
                pass
            continue

        # ── Closing Balance line ──────────────────────────────────────────
        # "Closing Balance Units: 1200.000 Avg NAV: Rs. 180.00 Current NAV: Rs. 245.00 Current Value: Rs. 2,94,000.00XIRR: 18.45%"
        if "Closing Balance" in line:
            u = re.search(r"Units:\s*([\d,]+\.?\d*)", line)
            avg = re.search(r"Avg NAV:\s*Rs\.\s*([\d,]+\.?\d*)", line)
            cnav = re.search(r"Current NAV:\s*Rs\.\s*([\d,]+\.?\d*)", line)
            cval = re.search(r"Current Value:\s*Rs\.\s*([\d,]+\.?\d*)", line)
            xirr = re.search(r"XIRR:\s*([\d.]+)%", line)

            if u:
                current["units"] = float(u.group(1).replace(",", ""))
            if avg:
                current["avg_nav"] = float(avg.group(1).replace(",", ""))
            if cnav:
                current["current_nav"] = float(cnav.group(1).replace(",", ""))
            if cval:
                current["current_value"] = float(cval.group(1).replace(",", ""))
            if xirr:
                current["xirr"] = float(xirr.group(1))
            continue

    # Append last holding
    if current:
        holdings.append(_build_holding(current))

    return holdings


def _classify_transaction(description: str) -> str:
    desc = description.lower()
    if any(k in desc for k in ["purchase", "sip", "lumpsum", "reinvest", "buy"]):
        return "purchase"
    if any(k in desc for k in ["redemption", "redeem", "withdrawal", "sell"]):
        return "redemption"
    if "switch in" in desc:
        return "switch_in"
    if "switch out" in desc:
        return "switch_out"
    if "dividend" in desc:
        return "dividend"
    return "purchase"


def _build_holding(data: dict) -> MFHolding:
    units = data.get("units", 0.0)
    current_nav = data.get("current_nav", 0.0)
    avg_nav = data.get("avg_nav", 0.0)
    current_value = data.get("current_value", 0.0)

    # Fallback: compute current_value if missing
    if current_value == 0.0 and units > 0 and current_nav > 0:
        current_value = round(units * current_nav, 2)

    # Fallback: compute avg_nav from transactions if missing
    if avg_nav == 0.0 and data.get("transactions"):
        invested = sum(t.amount for t in data["transactions"] if t.type in ("purchase", "switch_in"))
        if units > 0:
            avg_nav = round(invested / units, 4)

    return MFHolding(
        scheme_name=data["scheme_name"],
        amc=data.get("amc"),
        category=data.get("category"),
        expense_ratio=data.get("expense_ratio"),
        units=units,
        avg_nav=avg_nav,
        current_nav=current_nav,
        current_value=current_value,
        xirr=data.get("xirr"),
        transactions=data.get("transactions", []),
    )


# ── Form 16 Parser ────────────────────────────────────────────────────────────

def parse_form16_pdf(file_bytes: bytes) -> TaxProfile:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    def extract_amount(patterns: list) -> float:
        for pattern in patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                return float(match.group(1).replace(",", ""))
        return 0.0

    # Gross salary — try multiple patterns
    gross_salary = extract_amount([
        r"Salary as per provisions u/s 17\(1\)[^\d]+([\d,]+)",
        r"gross salary[^\d]+([\d,]+)",
        r"Total Gross Salary[^\d]+([\d,]+)",
    ])

    # HRA
    hra_received = extract_amount([
        r"House Rent Allowance \(HRA\)[^\d]+([\d,]+)",
        r"house rent allowance[^\d]+([\d,]+)",
        r"HRA[^\d]+([\d,]+)",
    ])

    # 80C
    section_80c = extract_amount([
        r"80C[^\d]+([\d,]+)",
        r"PF \+ ELSS[^\d]+([\d,]+)",
    ])

    # 80D
    section_80d = extract_amount([
        r"80D[^\d]+([\d,]+)",
        r"Health Insurance Premium[^\d]+([\d,]+)",
    ])

    # 80CCD
    section_80ccd = extract_amount([
        r"80CCD[^\d]+([\d,]+)",
        r"NPS Contribution[^\d]+([\d,]+)",
    ])

    # Standard deduction
    std_ded = extract_amount([
        r"Standard Deduction u/s 16\(ia\)[^\d]+([\d,]+)",
        r"standard deduction[^\d]+([\d,]+)",
    ]) or 50_000

    # HRA exemption
    hra_exempt = extract_amount([
        r"HRA Exemption u/s 10\(13A\)[^\d]+([\d,]+)",
        r"hra exempt[^\d]+([\d,]+)",
    ])
    if hra_exempt == 0 and hra_received > 0:
        hra_exempt = min(hra_received, gross_salary * 0.40)

    return TaxProfile(
        gross_salary=gross_salary,
        hra_received=hra_received,
        hra_exempt=hra_exempt,
        deductions=Deductions(
            section_80c=min(section_80c, 150_000),
            section_80d=min(section_80d, 25_000),
            section_80ccd=min(section_80ccd, 50_000),
            hra_exemption=hra_exempt,
            standard_deduction=std_ded,
        ),
    )