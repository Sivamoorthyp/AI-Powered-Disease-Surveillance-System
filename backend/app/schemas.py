from pydantic import BaseModel, Field
from typing import Optional, List
import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    emp_id: Optional[str] = None
    district: Optional[str] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    emp_id: Optional[str] = None
    otp: Optional[str] = None
    password: Optional[str] = None

class UserCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    emp_id: Optional[str] = None
    name: str
    password: str
    role: str  # e.g., "ASHA Worker", "Doctor", "State Health Officer", etc.
    district: Optional[str] = None
    block: Optional[str] = None
    village: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: Optional[str] = None
    phone: Optional[str] = None
    emp_id: Optional[str] = None
    name: str
    role: str
    district: Optional[str] = None
    block: Optional[str] = None
    village: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# Disease Schemas
class DiseaseCreate(BaseModel):
    name: str
    category: str
    symptoms: Optional[str] = None
    warning_threshold: Optional[int] = 10
    recommended_medicines: Optional[str] = None
    containment_guidelines: Optional[str] = None

class DiseaseOut(BaseModel):
    id: int
    name: str
    category: str
    symptoms: Optional[str] = None
    warning_threshold: int
    recommended_medicines: Optional[str] = None
    containment_guidelines: Optional[str] = None

    class Config:
        from_attributes = True

# Case Report Schemas
class CaseReportCreate(BaseModel):
    patient_id: str
    disease_id: int
    symptoms: Optional[str] = None
    severity: str  # Low, Medium, High
    age: int
    gender: str
    village: str
    gram_panchayat: str
    block: str
    district: str
    latitude: float
    longitude: float
    report_date: Optional[datetime.date] = None
    status: str  # Confirmed, Suspected, Recovered, Death
    clinical_status: str  # Hospitalized, Isolation, Home-Quarantine
    is_vaccinated: Optional[bool] = False
    travel_history: Optional[str] = None
    photo_url: Optional[str] = None
    lab_report_url: Optional[str] = None
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None
    asha_name: Optional[str] = None

class CaseReportOut(BaseModel):
    id: int
    patient_id: str
    disease_id: int
    disease: DiseaseOut
    symptoms: Optional[str] = None
    severity: str
    age: int
    gender: str
    village: str
    gram_panchayat: str
    block: str
    district: str
    latitude: float
    longitude: float
    report_date: datetime.date
    status: str
    clinical_status: str
    is_vaccinated: bool
    travel_history: Optional[str] = None
    photo_url: Optional[str] = None
    lab_report_url: Optional[str] = None
    reported_by_user_id: Optional[int] = None
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None
    asha_name: Optional[str] = None

    class Config:
        from_attributes = True

# Alert Schemas
class AlertOut(BaseModel):
    id: int
    disease_id: int
    disease: DiseaseOut
    district: str
    block: Optional[str] = None
    level: str
    message: str
    created_at: datetime.datetime
    is_active: bool

    class Config:
        from_attributes = True

# Facility Schemas
class FacilityCreate(BaseModel):
    name: str
    type: str
    district: str
    block: str
    latitude: float
    longitude: float
    bed_count: Optional[int] = 10
    doctor_count: Optional[int] = 2

class FacilityOut(BaseModel):
    id: int
    name: str
    type: str
    district: str
    block: str
    latitude: float
    longitude: float
    bed_count: int
    doctor_count: int

    class Config:
        from_attributes = True

# Dashboard Stats Schemas
class SummaryStats(BaseModel):
    total_cases_today: int
    total_cases_week: int
    total_cases_month: int
    active_outbreaks: int
    recovered: int
    deaths: int
    high_risk_areas: List[str]
    medium_risk_areas: List[str]
    low_risk_areas: List[str]
    top_diseases: List[dict]
    most_affected_district: str
