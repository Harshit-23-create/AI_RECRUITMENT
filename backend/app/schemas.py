from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    admin = "admin"
    recruiter = "recruiter"
    candidate = "candidate"


# ─── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "User"

class TokenData(BaseModel):
    user_id: Optional[int] = None


# ─── Companies ─────────────────────────────────────────────────────────────────

class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    model_config = {"from_attributes": True}


# ─── Users ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: RoleEnum = RoleEnum.candidate
    company_id: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserPublic(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    model_config = {"from_attributes": True}

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    company: Optional[Company] = None

    model_config = {"from_attributes": True}


# ─── Jobs ──────────────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    title: str
    description: str
    department: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    is_active: bool = True
    company_id: Optional[int] = None

class JobCreate(JobBase):
    pass

class Job(JobBase):
    id: int
    recruiter_id: Optional[int] = None
    created_at: datetime
    company: Optional[Company] = None

    model_config = {"from_attributes": True}


# ─── Candidate Profiles ────────────────────────────────────────────────────────

class CandidateProfileBase(BaseModel):
    resume_url: Optional[str] = None
    parsed_skills: Optional[str] = None
    experience_years: Optional[int] = None
    education: Optional[str] = None
    headline: Optional[str] = None

class CandidateProfileCreate(CandidateProfileBase):
    pass  # user_id is taken from JWT, not from request body

class CandidateProfile(CandidateProfileBase):
    id: int
    user_id: int

    model_config = {"from_attributes": True}

class CandidateProfileWithUser(CandidateProfileBase):
    id: int
    user_id: int
    user: Optional[UserPublic] = None

    model_config = {"from_attributes": True}


# ─── Hiring Stages ─────────────────────────────────────────────────────────────

class HiringStageBase(BaseModel):
    name: str
    color: str = "text-blue-400"
    bg: str = "bg-blue-500/10"
    border: str = "border-blue-500/20"
    dot: str = "bg-blue-500"
    sequence: int = 0

class HiringStageCreate(HiringStageBase):
    pass

class HiringStage(HiringStageBase):
    id: int
    model_config = {"from_attributes": True}


# ─── Interviews ────────────────────────────────────────────────────────────────

class InterviewBase(BaseModel):
    application_id: int
    scheduled_at: datetime
    location_type: str = "online" # online | in_person
    meeting_link: Optional[str] = None
    feedback: Optional[str] = None
    rating: Optional[int] = None
    interviewer_id: Optional[int] = None
    questions: Optional[str] = None

class InterviewCreate(InterviewBase):
    pass

class Interview(InterviewBase):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Applications ──────────────────────────────────────────────────────────────

class ApplicationBase(BaseModel):
    job_id: int
    status: str = "applied"
    ats_score: Optional[int] = None
    ai_summary: Optional[str] = None
    ai_strengths: Optional[str] = None
    ai_gaps: Optional[str] = None
    ai_fit_breakdown: Optional[str] = None

class ApplicationCreate(BaseModel):
    job_id: int  # candidate_id is resolved from JWT

class Application(ApplicationBase):
    id: int
    candidate_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class ApplicationDetail(BaseModel):
    id: int
    job_id: int
    candidate_id: int
    status: str
    ats_score: Optional[int] = None
    ai_summary: Optional[str] = None
    ai_strengths: Optional[str] = None
    ai_gaps: Optional[str] = None
    ai_fit_breakdown: Optional[str] = None
    created_at: datetime
    # Joined fields
    job_title: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_skills: Optional[str] = None
    interviews: List[Interview] = []

    model_config = {"from_attributes": True}


# ─── Notifications ─────────────────────────────────────────────────────────────

class NotificationBase(BaseModel):
    title: str
    message: str

class NotificationCreate(NotificationBase):
    user_id: int

class Notification(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Audit Logs ────────────────────────────────────────────────────────────────

class AuditLogBase(BaseModel):
    action: str
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    user_id: Optional[int] = None

class AuditLog(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    user: Optional[UserPublic] = None

    model_config = {"from_attributes": True}


# ─── Application Activities ────────────────────────────────────────────────────

class ApplicationActivityBase(BaseModel):
    application_id: int
    action: str
    message: str

class ApplicationActivityCreate(ApplicationActivityBase):
    pass

class ApplicationActivity(ApplicationActivityBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_candidates: int
    active_jobs: int
    total_applications: int
    applications_by_status: dict
    recent_hires: int


# Update forward refs
Token.model_rebuild()
