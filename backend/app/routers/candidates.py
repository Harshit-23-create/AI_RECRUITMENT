import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user, require_recruiter_or_admin
from app import ai_service

router = APIRouter(
    prefix="/candidates",
    tags=["candidates"],
)

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _build_candidate_detail(candidate: models.CandidateProfile) -> schemas.CandidateProfileWithUser:
    return schemas.CandidateProfileWithUser(
        id=candidate.id,
        user_id=candidate.user_id,
        resume_url=candidate.resume_url,
        parsed_skills=candidate.parsed_skills,
        experience_years=candidate.experience_years,
        headline=candidate.headline,
        education=candidate.education,
        user=schemas.UserPublic(
            id=candidate.user.id,
            email=candidate.user.email,
            first_name=candidate.user.first_name,
            last_name=candidate.user.last_name,
        ) if candidate.user else None
    )


@router.get("/", response_model=List[schemas.CandidateProfileWithUser])
def read_candidates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidates = db.query(models.CandidateProfile).offset(skip).limit(limit).all()
    return [_build_candidate_detail(c) for c in candidates]


@router.get("/me", response_model=schemas.CandidateProfileWithUser)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No candidate profile found for your account")
    return _build_candidate_detail(profile)


@router.patch("/me", response_model=schemas.CandidateProfileWithUser)
def update_my_profile(
    update: schemas.CandidateProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()
    if not profile:
        # Auto-create if missing
        profile = models.CandidateProfile(user_id=current_user.id)
        db.add(profile)

    for key, value in update.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return _build_candidate_detail(profile)


@router.post("/me/upload-resume", response_model=schemas.CandidateProfileWithUser)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Upload a resume file. AI will parse skills and experience automatically."""
    # Validate file type
    allowed = {".pdf", ".docx", ".doc", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Use PDF, DOCX, or TXT.")

    # Save file
    filename = f"user_{current_user.id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract text from file
    resume_text = ""
    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                resume_text = f.read()
        elif ext == ".pdf":
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    resume_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            except ImportError:
                resume_text = f"PDF file uploaded: {file.filename}"
        elif ext in {".docx", ".doc"}:
            try:
                import docx
                doc = docx.Document(file_path)
                resume_text = "\n".join(para.text for para in doc.paragraphs)
            except ImportError:
                resume_text = f"DOCX file uploaded: {file.filename}"
    except Exception as e:
        resume_text = f"Resume file: {file.filename}"

    # AI parsing
    parsed = await ai_service.parse_resume_text(resume_text)

    # Update candidate profile
    profile = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.user_id == current_user.id
    ).first()
    if not profile:
        profile = models.CandidateProfile(user_id=current_user.id)
        db.add(profile)

    profile.resume_url = f"/uploads/resumes/{filename}"
    profile.parsed_skills = parsed.get("skills", "")
    profile.experience_years = parsed.get("experience_years", 0)
    if parsed.get("education"):
        profile.education = parsed["education"]
    if parsed.get("headline"):
        profile.headline = parsed["headline"]

    db.commit()
    db.refresh(profile)
    return _build_candidate_detail(profile)


@router.get("/{candidate_id}", response_model=schemas.CandidateProfileWithUser)
def read_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    candidate = db.query(models.CandidateProfile).filter(
        models.CandidateProfile.id == candidate_id
    ).first()
    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _build_candidate_detail(candidate)
