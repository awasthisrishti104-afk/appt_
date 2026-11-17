from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    patient_name = Column(String(120), nullable=True)
    patient_email = Column(String(150), nullable=True)
    patient_phone = Column(String(30), nullable=True)
    patient_age = Column(String(20), nullable=True, default="26")
    patient_gender = Column(String(30), nullable=True, default="Male")
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    doctor_name = Column(String(120), nullable=False)
    specialization = Column(String(100), nullable=False)
    clinic = Column(String(150), nullable=False, default="SmartCare Super-Specialty Center")
    consultation_mode = Column(String(60), nullable=False, default="Onsite Consultation")
    appointment_date = Column(String(40), nullable=False)
    appointment_time = Column(String(40), nullable=False)
    status = Column(String(30), nullable=False, default="Pending")  # Pending, Confirmed, Completed, Cancelled, Rejected
    symptoms = Column(String(500), nullable=True)
    consultation_notes = Column(String(1000), nullable=True)
    prescription_summary = Column(String(1000), nullable=True)
    token_number = Column(String(30), nullable=True)
    fee = Column(Integer, nullable=False, default=700)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
