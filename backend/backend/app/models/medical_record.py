from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    record_type = Column(String(60), nullable=False)  # Lab Report, Diagnosis, Consultation History, Prescription
    title = Column(String(150), nullable=False)
    doctor_name = Column(String(120), nullable=False)
    department = Column(String(100), nullable=False)
    diagnosis = Column(String(300), nullable=False)
    record_date = Column(String(40), nullable=False)
    status = Column(String(40), nullable=False, default="Available")
    notes = Column(String(500), nullable=True)
    file_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    medicine_name = Column(String(150), nullable=False)
    dosage = Column(String(80), nullable=False)
    frequency = Column(String(100), nullable=False)
    duration = Column(String(80), nullable=False)
    instructions = Column(String(250), nullable=False)
    doctor_name = Column(String(120), nullable=False)
    specialization = Column(String(100), nullable=False)
    prescribed_date = Column(String(40), nullable=False)
    status = Column(String(40), nullable=False, default="Active")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(60), nullable=False)  # Appointment Reminder, Report Availability, Payment Update
    title = Column(String(160), nullable=False)
    message = Column(String(400), nullable=False)
    time_label = Column(String(60), nullable=False, default="Just now")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BillingRecord(Base):
    __tablename__ = "billing_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    invoice_no = Column(String(50), nullable=False)
    service = Column(String(160), nullable=False)
    doctor_name = Column(String(120), nullable=False)
    amount = Column(Integer, nullable=False)
    bill_date = Column(String(40), nullable=False)
    payment_method = Column(String(60), nullable=False, default="UPI / Card")
    status = Column(String(40), nullable=False, default="Paid")  # Paid, Pending


class PatientHealthProfile(Base):
    __tablename__ = "patient_health_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    date_of_birth = Column(String(40), nullable=True, default="1999-05-15")
    gender = Column(String(30), nullable=True, default="Male")
    blood_group = Column(String(15), nullable=True, default="O+")
    height_cm = Column(String(20), nullable=True, default="172 cm")
    weight_kg = Column(String(20), nullable=True, default="68 kg")
    allergies = Column(String(250), nullable=True, default="None reported")
    chronic_conditions = Column(String(250), nullable=True, default="None")
    emergency_contact_name = Column(String(120), nullable=True, default="Family Member")
    emergency_contact_phone = Column(String(30), nullable=True, default="+91 9876543210")
    address = Column(String(300), nullable=True, default="Sector 62, Noida, UP")
    insurance_provider = Column(String(150), nullable=True, default="SmartCare Health Shield")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ticket_no = Column(String(40), nullable=False)
    category = Column(String(80), nullable=False)
    subject = Column(String(180), nullable=False)
    description = Column(String(500), nullable=False)
    status = Column(String(40), nullable=False, default="Open")
    created_date = Column(String(40), nullable=False)
