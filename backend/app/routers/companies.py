from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user, require_admin

router = APIRouter(
    prefix="/companies",
    tags=["companies"],
)

@router.get("/", response_model=List[schemas.Company])
def read_companies(db: Session = Depends(get_db)):
    return db.query(models.Company).all()

@router.post("/", response_model=schemas.Company, status_code=201)
def create_company(
    company: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/me", response_model=schemas.Company)
def get_my_company(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    return company

@router.patch("/me", response_model=schemas.Company)
def update_my_company(
    company_update: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.company_id:
        # Create it and link it
        db_company = models.Company(**company_update.model_dump())
        db.add(db_company)
        db.commit()
        db.refresh(db_company)
        current_user.company_id = db_company.id
        db.commit()
        return db_company
    
    company = db.query(models.Company).filter(models.Company.id == current_user.company_id).first()
    for key, value in company_update.model_dump(exclude_unset=True).items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    return company

@router.delete("/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_admin)
):
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
