from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
)


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    total_candidates = db.query(models.CandidateProfile).count()
    active_jobs = db.query(models.Job).filter(models.Job.is_active == True).count()
    total_applications = db.query(models.Application).count()
    recent_hires = db.query(models.Application).filter(models.Application.status == "offered").count()

    # Count applications by status
    status_counts = (
        db.query(models.Application.status, func.count(models.Application.id))
        .group_by(models.Application.status)
        .all()
    )
    applications_by_status = {status: count for status, count in status_counts}

    return schemas.DashboardStats(
        total_candidates=total_candidates,
        active_jobs=active_jobs,
        total_applications=total_applications,
        applications_by_status=applications_by_status,
        recent_hires=recent_hires,
    )


from pydantic import BaseModel
class ChatRequest(BaseModel):
    query: str


@router.post("/ai-chat")
async def dashboard_ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    from app import ai_service
    # Fetch database context
    candidates = db.query(models.CandidateProfile).all()
    jobs = db.query(models.Job).all()
    
    # Format candidates for prompt context
    c_list = []
    for c in candidates:
        c_list.append({
            "id": c.id,
            "headline": c.headline,
            "experience_years": c.experience_years,
            "parsed_skills": c.parsed_skills,
            "education": c.education,
            "user": {
                "first_name": c.user.first_name if c.user else "",
                "last_name": c.user.last_name if c.user else "",
                "email": c.user.email if c.user else ""
            }
        })
        
    j_list = []
    for j in jobs:
        j_list.append({
            "id": j.id,
            "title": j.title,
            "description": j.description,
            "department": j.department,
            "location": j.location,
            "salary_range": j.salary_range
        })
        
    db_context = {
        "candidates": c_list,
        "jobs": j_list
    }
    
    response = await ai_service.recruiter_chat(payload.query, db_context)
    return {"response": response}
