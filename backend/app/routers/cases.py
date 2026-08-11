from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.database import get_db
from app import models, schemas, crud, ai_engine

router = APIRouter(prefix="/cases", tags=["Case Reports"])

@router.get("/", response_model=List[schemas.CaseReportOut])
def get_all_reports(
    district: Optional[str] = None,
    block: Optional[str] = None,
    village: Optional[str] = None,
    disease_id: Optional[int] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    gender: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    date_start: Optional[datetime.date] = None,
    date_end: Optional[datetime.date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.CaseReport).join(models.Disease)

    if district:
        query = query.filter(models.CaseReport.district == district)
    if block:
        query = query.filter(models.CaseReport.block == block)
    if village:
        query = query.filter(models.CaseReport.village == village)
    if disease_id:
        query = query.filter(models.CaseReport.disease_id == disease_id)
    if severity:
        query = query.filter(models.CaseReport.severity == severity)
    if status:
        query = query.filter(models.CaseReport.status == status)
    if gender:
        query = query.filter(models.CaseReport.gender == gender)
    if age_min is not None:
        query = query.filter(models.CaseReport.age >= age_min)
    if age_max is not None:
        query = query.filter(models.CaseReport.age <= age_max)
    if date_start:
        query = query.filter(models.CaseReport.report_date >= date_start)
    if date_end:
        query = query.filter(models.CaseReport.report_date <= date_end)

    return query.all()

@router.post("/", response_model=schemas.CaseReportOut)
async def submit_case_report(
    report: schemas.CaseReportCreate, 
    db: Session = Depends(get_db)
):
    # Validate disease exists
    disease = db.query(models.Disease).filter(models.Disease.id == report.disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease type not found in database")
        
    report_dict = report.dict()
    new_report = await crud.create_case_report(db, report_dict)
    return new_report

@router.get("/clusters")
def get_disease_clusters(
    disease_id: Optional[int] = None,
    eps_km: float = 5.0,
    min_samples: int = 3,
    db: Session = Depends(get_db)
):
    """
    Get spatial coordinate clusters for active diseases using DBSCAN.
    """
    return ai_engine.detect_spatial_clusters(db, disease_id=disease_id, eps_km=eps_km, min_samples=min_samples)

@router.get("/forecast/{district}")
def get_district_forecast(district: str, db: Session = Depends(get_db)):
    """
    Forecasting model prediction for future disease cases and containment directives.
    """
    # Normalize input
    dist_norm = district.capitalize()
    return ai_engine.forecast_district_cases(db, dist_norm)

@router.get("/{report_id}", response_model=schemas.CaseReportOut)
def get_report_by_id(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.CaseReport).filter(models.CaseReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Case report not found")
    return report
