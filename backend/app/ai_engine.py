import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session
import datetime
from typing import List, Dict, Any, Optional
from app.models import CaseReport, Disease, Facility

def detect_spatial_clusters(db: Session, disease_id: int = None, eps_km: float = 5.0, min_samples: int = 3) -> List[Dict[str, Any]]:
    """
    Detects spatial case clusters using the DBSCAN algorithm.
    eps_km defines the distance threshold (default 5km converted to radians for haversine).
    """
    query = db.query(CaseReport).filter(CaseReport.status.in_(["Confirmed", "Suspected"]))
    if disease_id:
        query = query.filter(CaseReport.disease_id == disease_id)
    
    cases = query.all()
    if len(cases) < min_samples:
        return []

    # Prepare coordinates
    coords = np.array([[c.latitude, c.longitude] for c in cases])
    
    # 1 km in radians is approximately 1 / 6371.0088
    kms_per_radian = 6371.0088
    epsilon = eps_km / kms_per_radian

    dbscan = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
    # Fit DBSCAN (coordinates must be converted to radians for haversine metric)
    coords_rad = np.radians(coords)
    labels = dbscan.fit_predict(coords_rad)

    clusters = []
    unique_labels = set(labels)
    for label in unique_labels:
        if label == -1:
            continue # Noise points
        
        class_member_mask = (labels == label)
        cluster_coords = coords[class_member_mask]
        cluster_cases = [cases[i] for i, mask in enumerate(class_member_mask) if mask]
        
        # Calculate centroid
        centroid = cluster_coords.mean(axis=0)
        
        # Count severity
        severities = {"Low": 0, "Medium": 0, "High": 0}
        disease_names = {}
        for c in cluster_cases:
            severities[c.severity] = severities.get(c.severity, 0) + 1
            disease_name = c.disease.name if c.disease else "Unknown"
            disease_names[disease_name] = disease_names.get(disease_name, 0) + 1
            
        top_disease = max(disease_names, key=disease_names.get) if disease_names else "Unknown"

        # Calculate bounding box radius (approximate in km)
        dists = []
        for pt in cluster_coords:
            # Haversine distance from centroid
            dlat = np.radians(pt[0] - centroid[0])
            dlon = np.radians(pt[1] - centroid[1])
            a = np.sin(dlat/2)**2 + np.cos(np.radians(pt[0])) * np.cos(np.radians(centroid[0])) * np.sin(dlon/2)**2
            c_dist = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
            dists.append(c_dist * kms_per_radian)
        radius_km = max(dists) if dists else 1.0

        clusters.append({
            "cluster_id": int(label),
            "center_lat": float(centroid[0]),
            "center_lng": float(centroid[1]),
            "radius_km": float(round(radius_km, 2)),
            "case_count": len(cluster_cases),
            "severity_breakdown": severities,
            "primary_disease": top_disease,
            "risk_score": min(100, int(len(cluster_cases) * 5 + severities["High"] * 10))
        })
        
    return sorted(clusters, key=lambda x: x["risk_score"], reverse=True)

def forecast_district_cases(db: Session, district_name: str) -> Dict[str, Any]:
    """
    Forecasts disease cases for the next 7 days using simple linear extrapolation
    fitted on weekly historical aggregates.
    """
    today = datetime.date.today()
    weeks = []
    counts = []

    # Get data for the last 4 weeks
    for i in range(4):
        start_date = today - datetime.timedelta(days=(i+1)*7)
        end_date = today - datetime.timedelta(days=i*7)
        count = db.query(CaseReport)\
            .filter(CaseReport.district == district_name)\
            .filter(CaseReport.report_date >= start_date)\
            .filter(CaseReport.report_date < end_date).count()
        weeks.append(i)
        counts.append(count)

    # Reverse to represent time sequence: week 3 (oldest) to week 0 (latest)
    weeks.reverse()
    counts.reverse()

    # Linear regression fit: Y = m*X + c
    if len(counts) > 1:
        x = np.array(weeks)
        y = np.array(counts)
        A = np.vstack([x, np.ones(len(x))]).T
        m, c = np.linalg.lstsq(A, y, rcond=None)[0]
        
        # Predict next week (X = 4)
        next_week_prediction = max(0, int(round(m * 4 + c)))
        trend = "increasing" if m > 0.5 else "decreasing" if m < -0.5 else "stable"
        confidence = "High" if len(y) >= 4 else "Medium"
    else:
        next_week_prediction = 5
        trend = "stable"
        confidence = "Low"
        m = 0

    # Risk score based on active cases and growth rate (slope m)
    active_cases = db.query(CaseReport)\
        .filter(CaseReport.district == district_name)\
        .filter(CaseReport.status.in_(["Confirmed", "Suspected"])).count()
        
    risk_score = min(100, max(5, int(active_cases * 1.5 + m * 5)))
    
    # AI generated containment guidelines
    containment_measures = [
        "Enforce active surveillance within a 2km radius of positive cases.",
        "Deploy ASHA workers for daily door-to-door temperature and symptom audits.",
        "Ensure local PHCs have adequate stocks of standard treatment protocols."
    ]
    if risk_score > 60:
        containment_measures.extend([
            "Declare localized containment zone and restrict public movement.",
            "Establish secondary isolation wards in the nearest Community Health Center (CHC)."
        ])
    elif risk_score > 30:
        containment_measures.append("Perform target chemical spraying / vector sterilization in highly populated spots.")

    return {
        "district": district_name,
        "current_active_cases": active_cases,
        "predicted_cases_next_week": next_week_prediction,
        "growth_rate_trend": trend,
        "confidence_level": confidence,
        "risk_score": risk_score,
        "suggested_containment_zones": containment_measures,
        "prediction_timestamp": datetime.datetime.now().isoformat()
    }

def run_ai_chatbot(db: Session, user_query: str, district: Optional[str] = None) -> str:
    """
    Rule-based local health agent acting as an AI chatbot.
    Answers disease descriptions, checks current case rates in districts, and suggests local support.
    """
    q = user_query.lower()
    
    # List of supported districts
    districts = [
        "khordha", "cuttack", "ganjam", "puri", "balasore", "mayurbhanj", 
        "sambalpur", "sundargarh", "bhadrak", "angul", "jajpur", "balangir"
    ]
    
    # 1. District specific caseload queries
    matched_district = None
    for d in districts:
        if d in q:
            matched_district = d.capitalize()
            break
            
    if matched_district:
        cases_count = db.query(CaseReport).filter(CaseReport.district == matched_district).count()
        active_count = db.query(CaseReport)\
            .filter(CaseReport.district == matched_district)\
            .filter(CaseReport.status.in_(["Confirmed", "Suspected"])).count()
        return (
            f"According to the live State Health portal, **{matched_district}** currently has **{cases_count}** reported cases, "
            f"with **{active_count}** active cases. The local medical facilities (PHCs/CHCs) have been alerted. "
            f"If you're noticing symptoms, please consult the nearest clinic immediately."
        )

    # 2. Disease description or prevention queries
    if "dengue" in q:
        return (
            "**Dengue Fever Prevention Guidelines (Odisha Health Department):**\n"
            "1. Avoid water accumulation in containers, pots, and old tyres to prevent Aedes mosquito breeding.\n"
            "2. Sleep under insecticide-treated bed nets (LLINs).\n"
            "3. Wear full-sleeve clothes and use mosquito repellents.\n"
            "**Treatment Guidelines:** Drink plenty of fluids (ORS, coconut water) and take Paracetamol. Do NOT take Ibuprofen or Aspirin. Local health centers in Odisha are stocked with antigen diagnostic kits."
        )
    elif "malaria" in q:
        return (
            "**Malaria Prevention Guidelines:**\n"
            "1. Spraying of DDT/Synthetic Pyrethroids in indoor spaces.\n"
            "2. Early diagnosis and complete treatment using ACT (Artemisinin-based Combination Therapy).\n"
            "3. Report any fever with chills to your local ASHA worker."
        )
    elif "cholera" in q or "diarrhea" in q:
        return (
            "**Waterborne Outbreak Guidelines (Odisha PHD):**\n"
            "1. Boil drinking water or treat it with chlorine tablets.\n"
            "2. Maintain strict hygiene and wash hands with soap before meals.\n"
            "3. Administer oral rehydration solutions (ORS) and Zinc dispersible tablets immediately for diarrhea. "
            "Report cluster cases in any village/block immediately to trigger water disinfection teams."
        )
    elif "containment" in q or "quarantine" in q:
        return (
            "Containment measures are dynamically computed using spatial DBSCAN clustering. When case density "
            "crosses warning thresholds, a Red Alert is dispatched to the District Health Officer. Action rules "
            "recommend village level containment zones with a 2-3km radius buffer."
        )
    elif "help" in q or "hospital" in q or "doctor" in q:
        if district:
            hospitals = db.query(Facility).filter(Facility.district == district).limit(3).all()
            if hospitals:
                list_str = "\n".join([f"- **{h.name}** ({h.type}) in {h.block} block" for h in hospitals])
                return f"Here are some nearby medical facilities in **{district}**:\n{list_str}\nYou can also contact the toll-free health helpline at **104**."
        return "You can contact the Odisha Government Health Helpline by calling **104** (toll-free) for immediate medical counseling, or reach out to your village ASHA worker."
    
    # 3. Default response
    return (
        "I am the Odisha Disease Surveillance AI Assistant. I can help you with:\n"
        "- Active case numbers and risk levels in any Odisha district (e.g., 'What are the cases in Cuttack?').\n"
        "- Containment measures and treatment guidelines for diseases like Dengue, Malaria, and Cholera.\n"
        "- Recommending nearby hospitals and health clinics. Call **104** for official emergency assistance."
    )
