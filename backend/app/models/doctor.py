from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), nullable=True, index=True)
    phone = Column(String(30), nullable=True)
    specialization = Column(String(100), nullable=False, index=True)
    qualification = Column(String(150), nullable=False)
    experience = Column(String(50), nullable=False)
    medical_reg_no = Column(String(80), nullable=True, default="MCI-2026-8841")
    clinic = Column(String(150), nullable=False, default="SmartCare Super-Specialty Hospital")
    room = Column(String(50), nullable=False, default="OPD Wing A")
    fee = Column(Integer, nullable=False, default=700)
    schedule = Column(String(150), nullable=False, default="Mon - Sat • 09:00 AM - 05:00 PM")
    rating = Column(String(20), nullable=False, default="4.9")
    avatar = Column(String(300), nullable=True)
    available = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=True)
    approval_status = Column(String(30), nullable=False, default="approved")  # pending, approved, rejected
    applied_date = Column(String(40), nullable=True, default="Nov 1, 2026")
