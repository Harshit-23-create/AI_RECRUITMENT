import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user, require_recruiter_or_admin
from app import ai_service

router = APIRouter(
    prefix="/applications",
    tags=["applications"],
)


def _build_detail(app: models.Application) -> schemas.ApplicationDetail:
    candidate_name = ""
    candidate_email = ""
    if app.candidate and app.candidate.user:
        u = app.candidate.user
        candidate_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email
        candidate_email = u.email

    return schemas.ApplicationDetail(
        id=app.id,
        job_id=app.job_id,
        candidate_id=app.candidate_id,
        status=app.status,
        ats_score=app.ats_score,
        ai_summary=app.ai_summary,
        ai_strengths=app.ai_strengths,
        ai_gaps=app.ai_gaps,
        ai_fit_breakdown=app.ai_fit_breakdown,
        created_at=app.created_at,
        job_title=app.job.title if app.job else None,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        candidate_skills=app.candidate.parsed_skills if app.candidate else None,
        interviews=[schemas.Interview.model_validate(i) for i in app.interviews] if app.interviews else [],
    )


@router.post("/", response_model=schemas.ApplicationDetail, status_code=201)
def create_application(
    payload: schemas.ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Get the candidate profile for this user
    candidate = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()
    if not candidate:
        raise HTTPException(
            status_code=400,
            detail="You need a candidate profile to apply. Please complete your profile first."
        )

    # Check job exists
    job = db.query(models.Job).filter(models.Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Prevent duplicate application
    existing = db.query(models.Application).filter(
        models.Application.job_id == payload.job_id,
        models.Application.candidate_id == candidate.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="You have already applied to this job")

    db_app = models.Application(
        job_id=payload.job_id,
        candidate_id=candidate.id,
        status="applied"
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    return _build_detail(db_app)


@router.get("/", response_model=List[schemas.ApplicationDetail])
def read_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Application)

    # Candidates only see their own applications
    if current_user.role == models.RoleEnum.candidate:
        profile = db.query(models.CandidateProfile).filter(
            models.CandidateProfile.user_id == current_user.id
        ).first()
        if profile:
            query = query.filter(models.Application.candidate_id == profile.id)
        else:
            return []

    applications = query.offset(skip).limit(limit).all()
    return [_build_detail(a) for a in applications]


@router.patch("/{application_id}/status", response_model=schemas.ApplicationDetail)
async def update_application_status(
    application_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    stages = db.query(models.HiringStage).all()
    valid_statuses = {s.name.lower() for s in stages} if stages else {"applied", "screening", "interviewed", "offered", "rejected"}
    if status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    prev_status = application.status
    application.status = status.lower()

    # Trigger AI evaluation when moving to screening (only if not already evaluated)
    if status.lower() == "screening" and prev_status != "screening" and not application.ats_score:
        job = db.query(models.Job).filter(models.Job.id == application.job_id).first()
        candidate = db.query(models.CandidateProfile).filter(
            models.CandidateProfile.id == application.candidate_id
        ).first()

        job_desc = job.description if job else ""
        skills = candidate.parsed_skills if candidate else ""
        exp = candidate.experience_years if candidate else 0

        result = await ai_service.evaluate_candidate(job_desc, skills, exp)

        application.ats_score = result["score"]
        application.ai_summary = result["summary"]
        application.ai_strengths = json.dumps(result.get("strengths", []))
        application.ai_gaps = json.dumps(result.get("gaps", []))
        application.ai_fit_breakdown = json.dumps(result.get("fit_breakdown", {}))

    # Add notification and email alert on status changes
    if status.lower() != prev_status:
        candidate = db.query(models.CandidateProfile).filter(
            models.CandidateProfile.id == application.candidate_id
        ).first()
        if candidate and candidate.user_id:
            job_title = application.job.title if application.job else "Job opening"
            notif = models.Notification(
                user_id=candidate.user_id,
                title="Application Status Updated",
                message=f"Your application for '{job_title}' has been moved to '{status.capitalize()}'."
            )
            db.add(notif)
            
            # Print mock email alert
            print(f"\n[MOCK EMAIL ALERT] Send to: {candidate.user.email}")
            print(f"Subject: Status update on your application for {job_title}")
            print(f"Body: Hello {candidate.user.first_name or 'Candidate'},\n\nWe would like to inform you that your application status has been updated to: {status.upper()}.\n\nBest regards,\nTalentAI Team\n")

    db.commit()
    db.refresh(application)
    return _build_detail(application)


@router.delete("/{application_id}", status_code=204)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Candidates can withdraw their own; admins/recruiters can delete any
    if current_user.role == models.RoleEnum.candidate:
        profile = db.query(models.CandidateProfile).filter(
            models.CandidateProfile.user_id == current_user.id
        ).first()
        if not profile or application.candidate_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(application)
    db.commit()
