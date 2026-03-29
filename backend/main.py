from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.agents import router as agents_router
from core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="AI Money Mentor API",
    description="6-agent AI financial planning system for Indian investors",
    version="1.0.0",
)

# FIXED CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router, prefix="/api/v1", tags=["agents"])


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/")
async def root():
    return {
        "message": "AI Money Mentor API",
        "agents": [
            "mf_xray",
            "tax_wizard",
            "health_score",
            "fire_planner",
            "life_event",
            "couples_planner",
        ],
        "docs": "/docs",
    }