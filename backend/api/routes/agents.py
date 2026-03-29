from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from models.schemas import (
    UserProfile, UserProfileCreate, CoupleProfile,
    MFPortfolio, TaxProfile, HealthScoreInput,
    FIREInput, LifeEventInput, AgentResponse
)
from agents.mf_xray import MFXRayAgent
from agents.tax_wizard import TaxWizardAgent
from agents.health_score import HealthScoreAgent
from agents.fire_planner import FIREAgent
from agents.life_event import LifeEventAgent
from agents.couples_planner import CouplesAgent
from parsers.pdf_parser import parse_cams_pdf, parse_form16_pdf
from core.supabase import get_supabase
from datetime import datetime

router = APIRouter()


# ── Users ─────────────────────────────────────────────────────────────────────

@router.post("/users", response_model=dict)
async def create_user(data: UserProfileCreate):
    db = get_supabase()
    result = db.table("user_profiles").insert(data.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create user")
    return {"user_id": result.data[0]["user_id"], "message": "Profile created"}


@router.get("/users/{user_id}", response_model=dict)
async def get_user(user_id: str):
    db = get_supabase()
    result = db.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.put("/users/{user_id}", response_model=dict)
async def update_user(user_id: str, data: UserProfileCreate):
    db = get_supabase()
    result = db.table("user_profiles").update(data.model_dump()).eq("user_id", user_id).execute()
    return {"message": "Profile updated", "data": result.data}


# ── MF X-Ray ──────────────────────────────────────────────────────────────────

@router.post("/agents/mf-xray/upload", response_model=AgentResponse)
async def mf_xray_upload(user_id: str, file: UploadFile = File(...)):
    """Upload CAMS/KFintech PDF and get full portfolio X-Ray."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    file_bytes = await file.read()
    holdings = parse_cams_pdf(file_bytes)

    if not holdings:
        raise HTTPException(status_code=422, detail="Could not parse holdings from PDF")

    total_invested = sum(
        sum(t.amount for t in h.transactions if t.type in ("purchase", "switch_in"))
        for h in holdings
    )
    total_value = sum(h.current_value or 0 for h in holdings)

    portfolio = MFPortfolio(
        user_id=user_id,
        holdings=holdings,
        total_invested=total_invested,
        total_current_value=total_value,
        parsed_at=datetime.utcnow(),
    )

    agent = MFXRayAgent()
    result = await agent.run(portfolio)
    return AgentResponse(success=True, agent="mf_xray", data=result)


@router.post("/agents/mf-xray/manual", response_model=AgentResponse)
async def mf_xray_manual(portfolio: MFPortfolio):
    """Submit portfolio data manually (JSON)."""
    agent = MFXRayAgent()
    result = await agent.run(portfolio)
    return AgentResponse(success=True, agent="mf_xray", data=result)


# ── Tax Wizard ────────────────────────────────────────────────────────────────

@router.post("/agents/tax/upload", response_model=AgentResponse)
async def tax_upload(user_id: str, file: UploadFile = File(...)):
    """Upload Form 16 PDF for tax analysis."""
    file_bytes = await file.read()
    tax_profile = parse_form16_pdf(file_bytes)
    tax_profile.user_id = user_id

    agent = TaxWizardAgent()
    result = await agent.run(tax_profile)
    return AgentResponse(success=True, agent="tax_wizard", data=result)


@router.post("/agents/tax/manual", response_model=AgentResponse)
async def tax_manual(tax_profile: TaxProfile):
    """Submit salary details manually for tax analysis."""
    agent = TaxWizardAgent()
    result = await agent.run(tax_profile)
    return AgentResponse(success=True, agent="tax_wizard", data=result)


# ── Health Score ──────────────────────────────────────────────────────────────

@router.post("/agents/health-score", response_model=AgentResponse)
async def health_score(data: HealthScoreInput):
    agent = HealthScoreAgent()
    result = await agent.run(data)
    return AgentResponse(success=True, agent="health_score", data=result)


@router.get("/agents/health-score/{user_id}/history", response_model=dict)
async def health_score_history(user_id: str):
    db = get_supabase()
    result = db.table("health_scores").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
    return {"history": result.data}


# ── FIRE Planner ──────────────────────────────────────────────────────────────

@router.post("/agents/fire", response_model=AgentResponse)
async def fire_planner(data: FIREInput):
    agent = FIREAgent()
    result = await agent.run(data)
    return AgentResponse(success=True, agent="fire_planner", data=result)


# ── Life Event ────────────────────────────────────────────────────────────────

@router.post("/agents/life-event", response_model=AgentResponse)
async def life_event(data: LifeEventInput):
    agent = LifeEventAgent()
    result = await agent.run(data)
    return AgentResponse(success=True, agent="life_event", data=result)


# ── Couple's Planner ──────────────────────────────────────────────────────────

@router.post("/agents/couples", response_model=AgentResponse)
async def couples_planner(data: CoupleProfile):
    agent = CouplesAgent()
    result = await agent.run(data)
    return AgentResponse(success=True, agent="couples_planner", data=result)


@router.post("/agents/couples/link", response_model=dict)
async def link_partners(partner_a_id: str, partner_b_id: str):
    """Link two users as a couple and mark both_ready."""
    db = get_supabase()
    result = db.table("couple_profiles").insert({
        "partner_a_id": partner_a_id,
        "partner_b_id": partner_b_id,
        "both_ready": True,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to link partners")
    couple_id = result.data[0]["couple_id"]
    # Update both user profiles with partner references
    db.table("user_profiles").update({"partner_id": partner_b_id}).eq("user_id", partner_a_id).execute()
    db.table("user_profiles").update({"partner_id": partner_a_id}).eq("user_id", partner_b_id).execute()
    return {"couple_id": couple_id, "message": "Partners linked successfully"}
