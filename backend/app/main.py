from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app import models
from app.routers import jobs, candidates, applications, auth, dashboard, stages, interviews, notifications
import os

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed default hiring stages
from app.database import SessionLocal
db = SessionLocal()
try:
    if db.query(models.HiringStage).count() == 0:
        default_stages = [
            {"name": "applied", "color": "text-blue-400", "bg": "bg-blue-500/10", "border": "border-blue-500/20", "dot": "bg-blue-500", "sequence": 1},
            {"name": "screening", "color": "text-purple-400", "bg": "bg-purple-500/10", "border": "border-purple-500/20", "dot": "bg-purple-500", "sequence": 2},
            {"name": "interviewed", "color": "text-amber-400", "bg": "bg-amber-500/10", "border": "border-amber-500/20", "dot": "bg-amber-500", "sequence": 3},
            {"name": "offered", "color": "text-emerald-400", "bg": "bg-emerald-500/10", "border": "border-emerald-500/20", "dot": "bg-emerald-500", "sequence": 4},
            {"name": "rejected", "color": "text-red-400", "bg": "bg-red-500/10", "border": "border-red-500/20", "dot": "bg-red-500", "sequence": 5},
        ]
        for s in default_stages:
            db_stage = models.HiringStage(**s)
            db.add(db_stage)
        db.commit()
finally:
    db.close()

# Create uploads directory
os.makedirs("uploads/resumes", exist_ok=True)

app = FastAPI(
    title="TalentAI API",
    description="AI-powered Applicant Tracking System — REST API",
    version="2.0.0"
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded resumes
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(applications.router)
app.include_router(stages.router)
app.include_router(interviews.router)
app.include_router(notifications.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to TalentAI API v2.0", "docs": "/docs"}
