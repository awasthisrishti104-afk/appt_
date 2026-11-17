from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, SessionLocal, test_connection
from app.models.user import User
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.appointment import Appointment
from app.models.medical_record import (
    MedicalRecord,
    Prescription,
    Notification,
    BillingRecord,
    PatientHealthProfile,
    SupportTicket,
)
from app.routes.auth import router as auth_router
from app.routes.dashboard import (
    router as dashboard_router,
    ensure_schema_and_hospital_seeded,
)


# Create FastAPI application
app = FastAPI(
    title="SmartCare API",
    description="Smart Hospital Appointment and Management System (Patient, Doctor & Super Admin)",
    version="2.0.0"
)


# Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routes
app.include_router(auth_router)
app.include_router(dashboard_router)


# Database initialization
@app.on_event("startup")
def startup_event():
    test_connection()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_schema_and_hospital_seeded(db)
    finally:
        db.close()


# Home API
@app.get("/")
def home():
    return {
        "message": "Welcome to SmartCare Backend",
        "status": "Running",
        "database": "Connected"
    }


# Health check API
@app.get("/health")
def health():
    return {
        "status": "Healthy",
        "application": "SmartCare"
    }
