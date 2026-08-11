from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/facilities", tags=["Facilities"])

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    # Radius of the Earth in km
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

@router.get("/", response_model=List[schemas.FacilityOut])
def get_facilities(
    district: Optional[str] = None,
    block: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Facility)
    if district:
        query = query.filter(models.Facility.district == district)
    if block:
        query = query.filter(models.Facility.block == block)
    if type:
        query = query.filter(models.Facility.type == type)
    return query.all()

@router.get("/nearby", response_model=List[schemas.FacilityOut])
def get_nearby_facilities(
    lat: float,
    lng: float,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    facilities = db.query(models.Facility).all()
    # Calculate distance for all facilities
    fac_with_dist = []
    for f in facilities:
        dist = calculate_haversine_distance(lat, lng, f.latitude, f.longitude)
        fac_with_dist.append((f, dist))
        
    # Sort by distance
    fac_with_dist.sort(key=lambda x: x[1])
    
    # Return top N
    return [item[0] for item in fac_with_dist[:limit]]

@router.post("/", response_model=schemas.FacilityOut)
def create_facility(facility: schemas.FacilityCreate, db: Session = Depends(get_db)):
    db_fac = models.Facility(**facility.dict())
    db.add(db_fac)
    db.commit()
    db.refresh(db_fac)
    return db_fac
