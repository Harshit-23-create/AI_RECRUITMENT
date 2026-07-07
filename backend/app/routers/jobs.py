from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user, require_recruiter_or_admin

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


@router.post("/", response_model=schemas.Job, status_code=201)
def create_job(
    job: schemas.JobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    db_job = models.Job(**job.model_dump(), recruiter_id=current_user.id)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job


@router.get("/", response_model=List[schemas.Job])
def read_jobs(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(models.Job)
    if active_only:
        query = query.filter(models.Job.is_active == True)
    return query.offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=schemas.Job)
def read_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}", response_model=schemas.Job)
def update_job(
    job_id: int,
    job_update: schemas.JobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role != models.RoleEnum.admin and job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this job")
    for key, value in job_update.model_dump(exclude_unset=True).items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role != models.RoleEnum.admin and job.recruiter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this job")
    db.delete(job)
    db.commit()
