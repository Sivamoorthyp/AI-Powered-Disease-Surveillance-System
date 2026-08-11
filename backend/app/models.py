from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    emp_id = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "Super Admin", "State Health Officer", "District Health Officer", "Hospital Administrator", "Doctor", "ASHA Worker", "Public Viewer"
    district = Column(String, nullable=True)
    block = Column(String, nullable=True)
    village = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    cases = relationship("CaseReport", back_populates="reporter")

class Disease(Base):
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=False)  # Vector-borne, Airborne, Water-borne, etc.
    symptoms = Column(String, nullable=True)
    warning_threshold = Column(Integer, default=10)  # cases per week to trigger alert
    recommended_medicines = Column(String, nullable=True)
    containment_guidelines = Column(String, nullable=True)

    cases = relationship("CaseReport", back_populates="disease")
    alerts = relationship("Alert", back_populates="disease")

class CaseReport(Base):
    __tablename__ = "case_reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    symptoms = Column(String, nullable=True)
    severity = Column(String, nullable=False)  # Low, Medium, High
    age = Column(Integer, nullable=False)
    gender = Column(String, nullable=False)  # Male, Female, Other
    village = Column(String, index=True, nullable=False)
    gram_panchayat = Column(String, nullable=False)
    block = Column(String, index=True, nullable=False)
    district = Column(String, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    report_date = Column(Date, default=datetime.date.today, index=True)
    status = Column(String, nullable=False)  # Confirmed, Suspected, Recovered, Death
    clinical_status = Column(String, nullable=False)  # Hospitalized, Isolation, Home-Quarantine
    is_vaccinated = Column(Boolean, default=False)
    travel_history = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    lab_report_url = Column(String, nullable=True)
    
    reported_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hospital_name = Column(String, nullable=True)
    doctor_name = Column(String, nullable=True)
    asha_name = Column(String, nullable=True)

    disease = relationship("Disease", back_populates="cases")
    reporter = relationship("User", back_populates="cases")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    district = Column(String, index=True, nullable=False)
    block = Column(String, index=True, nullable=True)
    level = Column(String, nullable=False)  # Red, Orange, Yellow
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    is_active = Column(Boolean, default=True)

    disease = relationship("Disease", back_populates="alerts")

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Hospital, PHC, CHC, District Hospital, Medical College
    district = Column(String, index=True, nullable=False)
    block = Column(String, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    bed_count = Column(Integer, default=10)
    doctor_count = Column(Integer, default=2)
