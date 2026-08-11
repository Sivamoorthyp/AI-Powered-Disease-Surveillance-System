from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas, crud

router = APIRouter(prefix="/diseases", tags=["Disease Database"])

@router.get("/", response_model=List[schemas.DiseaseOut])
def get_all_diseases(db: Session = Depends(get_db)):
    return crud.get_diseases(db)

@router.post("/", response_model=schemas.DiseaseOut)
def add_new_disease(disease: schemas.DiseaseCreate, db: Session = Depends(get_db)):
    # Check if duplicate exists
    existing = db.query(models.Disease).filter(models.Disease.name == disease.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Disease already exists in database")
        
    return crud.create_disease(
        db,
        name=disease.name,
        category=disease.category,
        symptoms=disease.symptoms,
        warning_threshold=disease.warning_threshold,
        recommended_medicines=disease.recommended_medicines,
        containment_guidelines=disease.containment_guidelines
    )

@router.get("/{disease_id}", response_model=schemas.DiseaseOut)
def get_disease_by_id(disease_id: int, db: Session = Depends(get_db)):
    disease = crud.get_disease(db, disease_id)
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found")
    return disease
