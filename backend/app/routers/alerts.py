from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/alerts", tags=["Health Alerts"])

@router.get("/", response_model=List[schemas.AlertOut])
def get_alerts(
    district: Optional[str] = None,
    level: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(models.Alert).join(models.Disease)
    if district:
        query = query.filter(models.Alert.district == district)
    if level:
        query = query.filter(models.Alert.level == level)
    if active_only:
        query = query.filter(models.Alert.is_active == True)
        
    return query.order_by(models.Alert.created_at.desc()).all()

@router.put("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.is_active = False
    db.commit()
    return {"message": "Alert resolved successfully", "id": alert_id}
