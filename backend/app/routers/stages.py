from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.dependencies import require_recruiter_or_admin

router = APIRouter(
    prefix="/stages",
    tags=["stages"],
)

@router.get("/", response_model=List[schemas.HiringStage])
def read_stages(db: Session = Depends(get_db)):
    return db.query(models.HiringStage).order_by(models.HiringStage.sequence.asc()).all()

@router.post("/", response_model=schemas.HiringStage, status_code=201)
def create_stage(
    stage: schemas.HiringStageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    # Check if stage name exists
    existing = db.query(models.HiringStage).filter(models.HiringStage.name == stage.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Stage name already exists")
    
    db_stage = models.HiringStage(**stage.model_dump())
    db.add(db_stage)
    db.commit()
    db.refresh(db_stage)
    return db_stage

@router.patch("/{stage_id}", response_model=schemas.HiringStage)
def update_stage(
    stage_id: int,
    stage_update: schemas.HiringStageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    db_stage = db.query(models.HiringStage).filter(models.HiringStage.id == stage_id).first()
    if not db_stage:
        raise HTTPException(status_code=404, detail="Stage not found")
        
    for key, value in stage_update.model_dump(exclude_unset=True).items():
        setattr(db_stage, key, value)
        
    db.commit()
    db.refresh(db_stage)
    return db_stage

@router.delete("/{stage_id}", status_code=204)
def delete_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_recruiter_or_admin)
):
    db_stage = db.query(models.HiringStage).filter(models.HiringStage.id == stage_id).first()
    if not db_stage:
        raise HTTPException(status_code=404, detail="Stage not found")
        
    # Prevent deleting core stages if desired, but here we can just delete
    db.delete(db_stage)
    db.commit()
