from sqlalchemy.orm import Session
from sqlalchemy import func
import datetime
from app.models import User, Disease, CaseReport, Alert, Facility
from app.websocket import manager
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_phone(db: Session, phone: str):
    return db.query(User).filter(User.phone == phone).first()

def get_user_by_emp_id(db: Session, emp_id: str):
    return db.query(User).filter(User.emp_id == emp_id).first()

def create_user(db: Session, user: User):
    # Hash password
    user.hashed_password = hash_password(user.hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# Disease CRUDS
def get_diseases(db: Session):
    return db.query(Disease).all()

def get_disease(db: Session, disease_id: int):
    return db.query(Disease).filter(Disease.id == disease_id).first()

def create_disease(db: Session, name: str, category: str, symptoms: str = None, warning_threshold: int = 10, recommended_medicines: str = None, containment_guidelines: str = None):
    db_disease = Disease(
        name=name,
        category=category,
        symptoms=symptoms,
        warning_threshold=warning_threshold,
        recommended_medicines=recommended_medicines,
        containment_guidelines=containment_guidelines
    )
    db.add(db_disease)
    db.commit()
    db.refresh(db_disease)
    return db_disease

# Case Report CRUDS
def get_cases(db: Session, skip: int = 0, limit: int = 100):
    return db.query(CaseReport).offset(skip).limit(limit).all()

async def create_case_report(db: Session, report_data: dict, reporter_id: int = None):
    # Convert report date if present
    if not report_data.get("report_date"):
        report_data["report_date"] = datetime.date.today()
    
    db_report = CaseReport(**report_data, reported_by_user_id=reporter_id)
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # 1. Trigger Alert Evaluation
    await evaluate_and_trigger_alerts(db, db_report.disease_id, db_report.district, db_report.block)

    # 2. Broadcast via WebSockets
    await manager.broadcast_json({
        "type": "NEW_CASE",
        "data": {
            "id": db_report.id,
            "patient_id": db_report.patient_id,
            "disease_name": db_report.disease.name,
            "severity": db_report.severity,
            "age": db_report.age,
            "gender": db_report.gender,
            "village": db_report.village,
            "block": db_report.block,
            "district": db_report.district,
            "latitude": db_report.latitude,
            "longitude": db_report.longitude,
            "status": db_report.status,
            "report_date": db_report.report_date.isoformat()
        }
    })

    return db_report

async def evaluate_and_trigger_alerts(db: Session, disease_id: int, district: str, block: str):
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        return

    # Count recent cases of this disease in the block/district over the last 7 days
    seven_days_ago = datetime.date.today() - datetime.timedelta(days=7)
    recent_cases = db.query(CaseReport)\
        .filter(CaseReport.disease_id == disease_id)\
        .filter(CaseReport.district == district)\
        .filter(CaseReport.block == block)\
        .filter(CaseReport.report_date >= seven_days_ago)\
        .filter(CaseReport.status.in_(["Confirmed", "Suspected"])).count()

    # Determine alert levels based on warning threshold
    threshold = disease.warning_threshold
    level = None
    
    if recent_cases >= threshold:
        level = "Red"
    elif recent_cases >= int(threshold * 0.6):
        level = "Orange"
    elif recent_cases >= int(threshold * 0.3):
        level = "Yellow"

    if level:
        # Create Alert
        msg = f"{level} Alert: Abnormal increase of {disease.name} cases ({recent_cases} active cases in last 7 days) in {block} block, {district} district."
        
        # Check if identical alert exists in the last 2 days to avoid spamming
        two_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=2)
        existing = db.query(Alert)\
            .filter(Alert.disease_id == disease_id)\
            .filter(Alert.district == district)\
            .filter(Alert.block == block)\
            .filter(Alert.level == level)\
            .filter(Alert.created_at >= two_days_ago).first()

        if not existing:
            db_alert = Alert(
                disease_id=disease_id,
                district=district,
                block=block,
                level=level,
                message=msg,
                is_active=True
            )
            db.add(db_alert)
            db.commit()
            db.refresh(db_alert)

            # Broadcast alert to all clients
            await manager.broadcast_json({
                "type": "NEW_ALERT",
                "data": {
                    "id": db_alert.id,
                    "disease_name": disease.name,
                    "district": db_alert.district,
                    "block": db_alert.block,
                    "level": db_alert.level,
                    "message": db_alert.message,
                    "created_at": db_alert.created_at.isoformat()
                }
            })

# Seed Database
def seed_database(db: Session):
    # 1. Seed standard diseases
    diseases_data = [
        {"name": "Dengue", "category": "Vector-borne", "symptoms": "High fever, severe headache, pain behind eyes, joint/muscle pain, rash", "warning_threshold": 8, "recommended_medicines": "Paracetamol, Oral Rehydration Salts (ORS)", "containment_guidelines": "Focal insecticide fogging, elimination of standing water, distribute LLIN mosquito nets."},
        {"name": "Malaria", "category": "Vector-borne", "symptoms": "Fever, chills, headache, sweats, nausea/vomiting", "warning_threshold": 10, "recommended_medicines": "Artesunate-Sulfadoxine-Pyrimethamine (ACT), Chloroquine, Primaquine", "containment_guidelines": "Indoor Residual Spraying (IRS), distribute LLIN bed nets, mass blood surveys."},
        {"name": "Typhoid", "category": "Water-borne", "symptoms": "Sustained high fever, weakness, stomach pain, headache, loss of appetite", "warning_threshold": 12, "recommended_medicines": "Ceftriaxone, Azithromycin, Ciprofloxacin", "containment_guidelines": "Chlorination of drinking water, inspection of local food stalls, sanitation audits."},
        {"name": "Cholera", "category": "Water-borne", "symptoms": "Profuse watery diarrhea (rice-water stools), vomiting, rapid dehydration", "warning_threshold": 5, "recommended_medicines": "Doxycycline, Azithromycin, zinc supplements, ORS", "containment_guidelines": "Establish water purification points, distribution of halogen tablets, isolation units."},
        {"name": "COVID-19", "category": "Airborne", "symptoms": "Fever, cough, tiredness, loss of taste or smell, breathing difficulties", "warning_threshold": 15, "recommended_medicines": "Remdesivir, Paxlovid, Paracetamol, cough syrup", "containment_guidelines": "Mandatory mask-wearing, contact tracing, localized lockdowns, quarantine zones."},
        {"name": "Tuberculosis", "category": "Airborne", "symptoms": "Cough lasting >3 weeks, chest pain, coughing blood, fatigue, night sweats", "warning_threshold": 20, "recommended_medicines": "Isoniazid, Rifampicin, Pyrazinamide, Ethambutol (DOTS therapy)", "containment_guidelines": "Sputum microscopy camps, contact testing, BCG vaccination verification."},
        {"name": "Japanese Encephalitis", "category": "Vector-borne", "symptoms": "Fever, headache, neck stiffness, seizures, mental confusion", "warning_threshold": 4, "recommended_medicines": "Supportive care, fluids, anti-seizure meds", "containment_guidelines": "Vaccination campaigns, vector control around pig farms, mosquito netting."},
        {"name": "Diarrhea", "category": "Water-borne", "symptoms": "Loose watery stools, abdominal cramps, dehydration", "warning_threshold": 25, "recommended_medicines": "ORS, Zinc sulphate tablets", "containment_guidelines": "Super-chlorination of local water tanks, sanitation awareness camps."}
    ]

    for d in diseases_data:
        if not db.query(Disease).filter(Disease.name == d["name"]).first():
            create_disease(db, **d)

    # 2. Seed Users
    # We create users for multiple roles
    users_data = [
        {"email": "admin@odisha.gov.in", "phone": "9999999999", "emp_id": "EMP-ADMIN-01", "name": "Super Admin", "role": "Super Admin", "password": "AdminPassword123"},
        {"email": "officer.state@odisha.gov.in", "phone": "9876543210", "emp_id": "EMP-STATE-01", "name": "Dr. Bijay Kumar Mohapatra", "role": "State Health Officer", "password": "StateOfficer123"},
        {"email": "officer.khordha@odisha.gov.in", "phone": "9876543211", "emp_id": "EMP-DIST-21", "name": "Dr. Artabandhu Nayak", "role": "District Health Officer", "password": "KhordhaOfficer123", "district": "Khordha"},
        {"email": "admin.capital@odisha.gov.in", "phone": "9876543212", "emp_id": "EMP-HOSP-12", "name": "Capital Hospital Admin", "role": "Hospital Administrator", "password": "CapitalAdmin123", "district": "Khordha", "block": "Bhubaneswar"},
        {"email": "doctor.cuttack@odisha.gov.in", "phone": "9876543213", "emp_id": "EMP-DOC-34", "name": "Dr. Sambit Patra", "role": "Doctor", "password": "DoctorPass123", "district": "Cuttack", "block": "Cuttack Sadar"},
        {"email": "asha.khordha@odisha.gov.in", "phone": "9876543214", "emp_id": "EMP-ASHA-05", "name": "Subhasini Sahoo", "role": "ASHA Worker", "password": "AshaPass123", "district": "Khordha", "block": "Bhubaneswar", "village": "Jatani"},
        {"email": "siva.asha@odisha.gov.in", "phone": "9876543215", "emp_id": "EMP-ASHA-205", "name": "Siva ASHA", "role": "ASHA Worker", "password": "si@2607", "district": "Khordha", "block": "Bhubaneswar", "village": "Jatani"},
        {"email": "siva.asha96@odisha.gov.in", "phone": "9345828471", "emp_id": "EMP-ASHA-267", "name": "S ASHA", "role": "ASHA Wrker", "password": "siva@2607", "district": "Khordha", "block": "Bhubaneswar", "village": "Jatani"}
    ]
    

    for u in users_data:
        # Check by email or emp_id
        if not db.query(User).filter((User.email == u["email"]) | (User.emp_id == u["emp_id"])).first():
            user_obj = User(
                email=u["email"],
                phone=u["phone"],
                emp_id=u["emp_id"],
                name=u["name"],
                role=u["role"],
                hashed_password=u["password"], # Will be hashed inside create_user
                district=u.get("district"),
                block=u.get("block"),
                village=u.get("village")
            )
            create_user(db, user_obj)

    # 3. Seed Facilities
    facilities_data = [
        {"name": "SCB Medical College & Hospital", "type": "Medical College", "district": "Cuttack", "block": "Cuttack Sadar", "latitude": 20.4704, "longitude": 85.8906, "bed_count": 1200, "doctor_count": 250},
        {"name": "Capital Hospital Bhubaneswar", "type": "Hospital", "district": "Khordha", "block": "Bhubaneswar", "latitude": 20.2584, "longitude": 85.8193, "bed_count": 600, "doctor_count": 95},
        {"name": "Jatani PHC", "type": "PHC", "district": "Khordha", "block": "Bhubaneswar", "latitude": 20.1601, "longitude": 85.7032, "bed_count": 15, "doctor_count": 3},
        {"name": "Puri District Hospital", "type": "District Hospital", "district": "Puri", "block": "Puri Sadar", "latitude": 19.8134, "longitude": 85.8315, "bed_count": 250, "doctor_count": 40},
        {"name": "Berhampur City Hospital", "type": "Hospital", "district": "Ganjam", "block": "Berhampur", "latitude": 19.3130, "longitude": 84.7951, "bed_count": 180, "doctor_count": 22},
        {"name": "Balasore District HQ Hospital", "type": "District Hospital", "district": "Balasore", "block": "Balasore Sadar", "latitude": 21.4922, "longitude": 86.9290, "bed_count": 300, "doctor_count": 55}
    ]

    for f in facilities_data:
        if not db.query(Facility).filter(Facility.name == f["name"]).first():
            db_fac = Facility(**f)
            db.add(db_fac)
            db.commit()

    # 4. Seed mock Case Reports with coordinates around district centers
    # This ensures clusters can be generated easily by DBSCAN
    dengue = db.query(Disease).filter(Disease.name == "Dengue").first()
    malaria = db.query(Disease).filter(Disease.name == "Malaria").first()
    cholera = db.query(Disease).filter(Disease.name == "Cholera").first()

    cases_to_seed = []
