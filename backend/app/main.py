from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import asyncio
from typing import Optional

from app.config import settings
from app.database import engine, Base, get_db
from app import crud, models, analytics, ai_engine
from app.websocket import manager
from app.routers import auth, cases, diseases, facilities, alerts, reports

# 1. Initialize DB tables
Base.metadata.create_all(bind=engine)

# 2. Seed default data if database is empty
db_session = next(get_db())
try:
    crud.seed_database(db_session)
finally:
    db_session.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Disease Surveillance, Mapping, and AI Outbreak Track System for Government of Odisha.",
    version="1.0.0"
)

# 3. CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For easy local pair-programming access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(diseases.router, prefix=settings.API_V1_STR)
app.include_router(facilities.router, prefix=settings.API_V1_STR)
app.include_router(alerts.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

# 5. Global Health Analytics Endpoint
@app.get(f"{settings.API_V1_STR}/summary", tags=["Analytics"])
def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Get live aggregates of disease surveillance today, this week, and this month.
    """
    return analytics.get_stats_summary(db)

@app.get(f"{settings.API_V1_STR}/district-stats/{{district}}", tags=["Analytics"])
def get_district_level_analytics(district: str, db: Session = Depends(get_db)):
    """
    Get metrics for a specific district.
    """
    return analytics.get_district_stats(db, district)

@app.get(f"{settings.API_V1_STR}/village-stats/{{district}}/{{village}}", tags=["Analytics"])
def get_village_level_analytics(district: str, village: str, db: Session = Depends(get_db)):
    """
    Get metrics for a specific village in a district.
    """
    return analytics.get_village_stats(db, village, district)

# 6. AI Chatbot Endpoint
from pydantic import BaseModel
class ChatbotMessage(BaseModel):
    message: str
    district: Optional[str] = None

@app.post(f"{settings.API_V1_STR}/chatbot", tags=["AI Chatbot"])
def ask_chatbot(payload: ChatbotMessage, db: Session = Depends(get_db)):
    """
    Communicate with the surveillance AI chatbot.
    """
    response_text = ai_engine.run_ai_chatbot(db, payload.message, payload.district)
    return {"reply": response_text}

# 7. WebSocket Live Counter/Alert Endpoints
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keep connection open and listen to messages
        while True:
            # We can receive queries or keep it as a keep-alive tick
            data = await websocket.receive_text()
            # Respond to client ping-pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
