from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user, require_recruiter_or_admin

router = APIRouter(
    prefix="/interviews",
    tags=["interviews"],
)

@router.get("/", response_model=List[schemas.Interview])
def read_interviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role in [models.RoleEnum.admin, models.RoleEnum.recruiter]:
        return db.query(models.Interview).all()
        
    # Candidates see only their own interviews
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()
    if not profile:
        return []
        
    return db.query(models.Interview).join(models.Application).filter(
        models.Application.candidate_id == profile.id
    ).all()

@router.post("/", response_model=schemas.Interview, status_code=201)
def schedule_interview(
    interview: schemas.InterviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    application = db.query(models.Application).filter(models.Application.id == interview.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
        
    db_interview = models.Interview(
        application_id=interview.application_id,
        scheduled_at=interview.scheduled_at,
        location_type=interview.location_type,
        meeting_link=interview.meeting_link,
        interviewer_id=interview.interviewer_id or current_user.id
    )
    db.add(db_interview)
    db.commit()
    db.refresh(db_interview)
    return db_interview

@router.patch("/{interview_id}", response_model=schemas.Interview)
def update_interview(
    interview_id: int,
    interview_update: schemas.InterviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    db_interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    for key, value in interview_update.model_dump(exclude_unset=True).items():
        setattr(db_interview, key, value)
        
    db.commit()
    db.refresh(db_interview)
    return db_interview

@router.delete("/{interview_id}", status_code=204)
def delete_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    db_interview = db.query(models.Interview).filter(models.Interview.id == interview_id).first()
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    db.delete(db_interview)
    db.commit()
