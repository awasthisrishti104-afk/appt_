from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import engine
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
from app.core.security import hash_password
from app.routes.auth import get_current_user, get_db, require_admin, require_doctor

router = APIRouter(tags=["SmartCare Platform"])


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class AppointmentCreateRequest(BaseModel):
    doctor_id: Optional[int] = None
    doctor_name: str
    specialization: str
    clinic: str = "SmartCare Super-Specialty Center"
    consultation_mode: str = "Onsite Consultation"
    appointment_date: str
    appointment_time: str
    symptoms: Optional[str] = ""
    fee: int = 700


class AppointmentRescheduleRequest(BaseModel):
    appointment_date: str
    appointment_time: str
    consultation_mode: Optional[str] = None
    clinic: Optional[str] = None


class AppointmentStatusRequest(BaseModel):
    status: str  # Pending, Confirmed, Completed, Cancelled, Rejected


class DoctorDecisionRequest(BaseModel):
    status: str  # Confirmed, Rejected, Completed
    consultation_notes: Optional[str] = None


class DoctorPrescriptionRequest(BaseModel):
    diagnosis: str
    consultation_notes: str
    medicine_name: str
    dosage: str = "1 Tablet"
    frequency: str = "Twice Daily (Morning & Night)"
    duration: str = "7 Days"
    instructions: str = "Take after meals with water."


class DoctorAvailabilityRequest(BaseModel):
    available: bool = True
    schedule: str
    fee: int
    clinic: Optional[str] = None
    room: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None


class DepartmentCreateRequest(BaseModel):
    name: str
    description: str
    head_doctor: Optional[str] = "Senior Specialist"
    room_wing: Optional[str] = "OPD Block A"


class AdminUserCreateRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    role: str = "patient"
    specialization: Optional[str] = "General Medicine"
    qualification: Optional[str] = "MBBS"
    experience: Optional[str] = "5 Years"
    medical_reg_no: Optional[str] = None
    fee: Optional[int] = 700


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    height_cm: Optional[str] = None
    weight_kg: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    address: Optional[str] = None
    insurance_provider: Optional[str] = None


class MedicalRecordCreateRequest(BaseModel):
    record_type: str = "Lab Report"
    title: str
    doctor_name: str
    department: str
    diagnosis: str
    record_date: Optional[str] = None
    notes: Optional[str] = ""
    file_name: Optional[str] = "Uploaded_Report.pdf"


class SupportTicketCreateRequest(BaseModel):
    category: str
    subject: str
    description: str


class AIChatRequest(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Schema Upgrade & Initial Seed Helper
# ---------------------------------------------------------------------------
_SCHEMA_MIGRATED = False


def ensure_schema_and_hospital_seeded(db: Session):
    global _SCHEMA_MIGRATED
    if not _SCHEMA_MIGRATED:
        alter_statements = [
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS user_id INTEGER",
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone VARCHAR(30)",
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_reg_no VARCHAR(80) DEFAULT 'MCI-2026-8841'",
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE",
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'approved'",
            "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS applied_date VARCHAR(40) DEFAULT 'Nov 1, 2026'",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(120)",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_email VARCHAR(150)",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(30)",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_age VARCHAR(20) DEFAULT '26'",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_gender VARCHAR(30) DEFAULT 'Male'",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_notes VARCHAR(1000)",
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS prescription_summary VARCHAR(1000)",
        ]
        with engine.begin() as conn:
            for stmt in alter_statements:
                try:
                    conn.execute(text(stmt))
                except Exception:
                    pass
        _SCHEMA_MIGRATED = True

    # 1. Ensure Super Admin User Exists
    admin_user = db.query(User).filter(User.email == "admin@smartcare.com").first()
    if not admin_user:
        admin_user = User(
            full_name="Super Admin",
            email="admin@smartcare.com",
            phone="9999900001",
            hashed_password=hash_password("Admin@123"),
            role="admin",
            is_active=True,
            is_approved=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # 2. Ensure Default Approved Doctor User Exists
    doc_user = db.query(User).filter(User.email == "santosh@smartcare.com").first()
    if not doc_user:
        doc_user = User(
            full_name="Dr. Santosh Rajab",
            email="santosh@smartcare.com",
            phone="9999900002",
            hashed_password=hash_password("Doctor@123"),
            role="doctor",
            is_active=True,
            is_approved=True,
        )
        db.add(doc_user)
        db.commit()
        db.refresh(doc_user)

    # 3. Ensure Default Departments Exist
    if db.query(Department).count() == 0:
        default_depts = [
            Department(
                name="Cardiology",
                description="Advanced heart, ECG, angiography and cardiovascular care.",
                head_doctor="Dr. Santosh Rajab",
                room_wing="Wing A • Ground Floor",
            ),
            Department(
                name="Orthopedics",
                description="Bone, joint replacement, spine and sports injury care.",
                head_doctor="Dr. Priya Verma",
                room_wing="Wing C • 1st Floor",
            ),
            Department(
                name="Neurology",
                description="Comprehensive brain, stroke, migraine and nerve care.",
                head_doctor="Dr. Meera Krishnan",
                room_wing="Wing B • 2nd Floor",
            ),
            Department(
                name="Ophthalmology",
                description="Complete vision, cataract, retina and laser eye care.",
                head_doctor="Dr. Anil Gupta",
                room_wing="Eye Wing • Ground Floor",
            ),
            Department(
                name="Pulmonology",
                description="Asthma, COPD, respiratory and lung care specialists.",
                head_doctor="Dr. Vikram Sethi",
                room_wing="Wing B • 1st Floor",
            ),
            Department(
                name="Hematology",
                description="Blood disorder, anemia and clinical pathology unit.",
                head_doctor="Dr. Siddharth Nair",
                room_wing="Wing A • 2nd Floor",
            ),
        ]
        db.add_all(default_depts)
        db.commit()

    # 4. Ensure Approved Doctors + Pending Doctor Approval Requests Exist
    if db.query(Doctor).count() == 0:
        seeded_doctors = [
            Doctor(
                user_id=doc_user.id,
                name="Dr. Santosh Rajab",
                email="santosh@smartcare.com",
                phone="9999900002",
                specialization="Cardiology",
                qualification="MD, DM (Cardiology) • AIIMS",
                experience="16 Years",
                medical_reg_no="MCI-CARD-1021",
                clinic="Fortis & SmartCare Heart Institute",
                room="Wing A • Room 101",
                fee=800,
                schedule="Mon - Sat • 09:00 AM - 05:00 PM",
                rating="4.9",
                avatar="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=True,
                approval_status="approved",
                applied_date="Oct 15, 2026",
            ),
            Doctor(
                name="Dr. Meera Krishnan",
                email="meera@smartcare.com",
                phone="9999900003",
                specialization="Neurology",
                qualification="MD, DM (Neurology)",
                experience="14 Years",
                medical_reg_no="MCI-NEUR-2044",
                clinic="Prime Specialist Medical Center",
                room="Wing B • Room 204",
                fee=900,
                schedule="Mon - Fri • 10:00 AM - 04:00 PM",
                rating="4.8",
                avatar="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=True,
                approval_status="approved",
                applied_date="Oct 18, 2026",
            ),
            Doctor(
                name="Dr. Anil Gupta",
                email="anil@smartcare.com",
                phone="9999900004",
                specialization="Ophthalmology",
                qualification="MS (Ophthalmology), FRCS",
                experience="15 Years",
                medical_reg_no="MCI-OPHT-3091",
                clinic="SmartCare Eye & Retina Care",
                room="Ground Floor • Room 004",
                fee=600,
                schedule="Mon - Sat • 09:00 AM - 02:00 PM",
                rating="4.9",
                avatar="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=True,
                approval_status="approved",
                applied_date="Oct 20, 2026",
            ),
            Doctor(
                name="Dr. Priya Verma",
                email="priya@smartcare.com",
                phone="9999900005",
                specialization="Orthopedics",
                qualification="MS (Orthopedics & Joint Replacement)",
                experience="11 Years",
                medical_reg_no="MCI-ORTH-4112",
                clinic="SmartCare Bone & Joint Clinic",
                room="Wing C • Room 112",
                fee=700,
                schedule="Mon - Sat • 10:00 AM - 06:00 PM",
                rating="4.7",
                avatar="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=True,
                approval_status="approved",
                applied_date="Oct 22, 2026",
            ),
            Doctor(
                name="Dr. Vikram Sethi",
                email="vikram@smartcare.com",
                phone="9999900006",
                specialization="Pulmonology",
                qualification="MD (Pulmonary & Critical Care)",
                experience="12 Years",
                medical_reg_no="MCI-PULM-5190",
                clinic="SmartCare Respiratory Wing",
                room="Wing B • Room 105",
                fee=650,
                schedule="Mon - Sat • 11:00 AM - 05:00 PM",
                rating="4.8",
                avatar="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=True,
                approval_status="approved",
                applied_date="Oct 24, 2026",
            ),
            Doctor(
                name="Dr. Siddharth Nair",
                email="siddharth@smartcare.com",
                phone="9999900007",
                specialization="Hematology",
                qualification="MD, DM (Clinical Hematology)",
                experience="13 Years",
                medical_reg_no="MCI-HEMA-6023",
                clinic="Prime Specialist Medical Center",
                room="Wing A • Room 208",
                fee=750,
                schedule="Tue - Sat • 09:30 AM - 03:30 PM",
                rating="4.9",
                avatar="https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=True,
                approval_status="approved",
                applied_date="Oct 25, 2026",
            ),
        ]
        db.add_all(seeded_doctors)
        db.commit()

    # Link Dr. Santosh Rajab to doc_user if not linked yet
    first_doc = db.query(Doctor).filter(Doctor.name == "Dr. Santosh Rajab").first()
    if first_doc and not first_doc.user_id:
        first_doc.user_id = doc_user.id
        first_doc.email = doc_user.email
        first_doc.is_approved = True
        first_doc.approval_status = "approved"
        db.commit()

    # Ensure Pending Doctor Approvals exist for Admin Dashboard demonstration
    pending_count = db.query(Doctor).filter(Doctor.approval_status == "pending").count()
    if pending_count == 0 and db.query(Doctor).count() <= 6:
        pending_samples = [
            Doctor(
                name="Dr. Rohit Sharma",
                email="rohit.sharma@smartcare.com",
                phone="9811122001",
                specialization="Cardiology",
                qualification="MD, DNB (Cardiology)",
                experience="9 Years",
                medical_reg_no="MCI-2026-7712",
                clinic="SmartCare Heart Institute",
                room="Wing A • Room 104",
                fee=750,
                schedule="Mon - Sat • 10:00 AM - 04:00 PM",
                rating="4.8",
                avatar="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=False,
                approval_status="pending",
                applied_date="Nov 1, 2026",
            ),
            Doctor(
                name="Dr. Kavita Rao",
                email="kavita.rao@smartcare.com",
                phone="9811122002",
                specialization="Orthopedics",
                qualification="MBBS, MS (Ortho)",
                experience="7 Years",
                medical_reg_no="MCI-2026-7749",
                clinic="SmartCare Bone & Joint Clinic",
                room="Wing C • Room 115",
                fee=650,
                schedule="Mon - Sat • 09:30 AM - 03:30 PM",
                rating="4.7",
                avatar="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=False,
                approval_status="pending",
                applied_date="Nov 2, 2026",
            ),
            Doctor(
                name="Dr. Arjun Mehta",
                email="arjun.mehta@smartcare.com",
                phone="9811122003",
                specialization="Neurology",
                qualification="MBBS, MD, DM (Neuro)",
                experience="10 Years",
                medical_reg_no="MCI-2026-7805",
                clinic="Prime Specialist Medical Center",
                room="Wing B • Room 209",
                fee=850,
                schedule="Mon - Fri • 11:00 AM - 05:00 PM",
                rating="4.9",
                avatar="https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80",
                available=True,
                is_approved=False,
                approval_status="pending",
                applied_date="Nov 3, 2026",
            ),
        ]
        db.add_all(pending_samples)
        db.commit()


def ensure_patient_seeded(db: Session, user: User):
    ensure_schema_and_hospital_seeded(db)

    profile = db.query(PatientHealthProfile).filter(PatientHealthProfile.user_id == user.id).first()
    if not profile:
        profile = PatientHealthProfile(
            user_id=user.id,
            date_of_birth="1999-08-14",
            gender="Male",
            blood_group="O+",
            height_cm="174 cm",
            weight_kg="69 kg",
            allergies="Dust pollen (Mild)",
            chronic_conditions="None",
            emergency_contact_name="Rajesh Kumar (Father)",
            emergency_contact_phone="+91 9811044556",
            address="Sector 67, Mohali / SmartCare Residency",
            insurance_provider="SmartCare Gold Health Cover",
        )
        db.add(profile)

    if db.query(Appointment).filter(Appointment.user_id == user.id).count() == 0:
        doc1 = db.query(Doctor).filter(Doctor.name == "Dr. Santosh Rajab").first()
        doc2 = db.query(Doctor).filter(Doctor.name == "Dr. Meera Krishnan").first()
        doc3 = db.query(Doctor).filter(Doctor.name == "Dr. Anil Gupta").first()
        sample_appts = [
            Appointment(
                user_id=user.id,
                patient_name=user.full_name,
                patient_email=user.email,
                patient_phone=user.phone,
                patient_age="26",
                patient_gender="Male",
                doctor_id=doc1.id if doc1 else 1,
                doctor_name="Dr. Santosh Rajab",
                specialization="Cardiology",
                clinic="Fortis & SmartCare Heart Institute",
                consultation_mode="Onsite Consultation",
                appointment_date="2026-11-06",
                appointment_time="10:00 AM",
                status="Confirmed",
                symptoms="Annual cardiac wellness check & ECG review",
                consultation_notes="ECG normal sinus rhythm. Continue healthy diet & daily walk.",
                token_number="SC-104",
                fee=800,
            ),
            Appointment(
                user_id=user.id,
                patient_name=user.full_name,
                patient_email=user.email,
                patient_phone=user.phone,
                patient_age="26",
                patient_gender="Male",
                doctor_id=doc1.id if doc1 else 1,
                doctor_name="Dr. Santosh Rajab",
                specialization="Cardiology",
                clinic="Fortis & SmartCare Heart Institute",
                consultation_mode="Online Consultation",
                appointment_date="2026-11-08",
                appointment_time="04:00 PM",
                status="Pending",
                symptoms="Blood pressure & lipid profile report consultation",
                token_number="SC-109",
                fee=800,
            ),
            Appointment(
                user_id=user.id,
                patient_name=user.full_name,
                patient_email=user.email,
                patient_phone=user.phone,
                patient_age="26",
                patient_gender="Male",
                doctor_id=doc3.id if doc3 else 3,
                doctor_name="Dr. Anil Gupta",
                specialization="Ophthalmology",
                clinic="SmartCare Eye & Retina Care",
                consultation_mode="Onsite Consultation",
                appointment_date="2026-10-21",
                appointment_time="11:00 AM",
                status="Completed",
                symptoms="Routine vision screening & digital eye strain",
                consultation_notes="6/6 vision. Prescribed lubricating drops for screen fatigue.",
                prescription_summary="Carboxymethylcellulose Eye Drops 0.5% - 3 times daily",
                token_number="SC-088",
                fee=600,
            ),
        ]
        db.add_all(sample_appts)

    if db.query(MedicalRecord).filter(MedicalRecord.user_id == user.id).count() == 0:
        sample_records = [
            MedicalRecord(
                user_id=user.id,
                record_type="Lab Report",
                title="Complete Blood Count (CBC) & Lipid Profile",
                doctor_name="Dr. Santosh Rajab",
                department="Cardiology",
                diagnosis="Normal lipid levels; Hemoglobin 14.6 g/dL (Optimal)",
                record_date="2026-10-28",
                status="Available",
                notes="Fasting sample analyzed at SmartCare Central Pathology.",
                file_name="CBC_Lipid_Report_Oct2026.pdf",
            ),
            MedicalRecord(
                user_id=user.id,
                record_type="Diagnosis",
                title="12-Lead Resting ECG & Echocardiogram",
                doctor_name="Dr. Santosh Rajab",
                department="Cardiology",
                diagnosis="Normal Sinus Rhythm (74 BPM), LVEF 62%",
                record_date="2026-10-25",
                status="Verified",
                notes="No ST-T wave abnormalities detected.",
                file_name="ECG_Echo_Summary.pdf",
            ),
            MedicalRecord(
                user_id=user.id,
                record_type="Consultation History",
                title="Ophthalmology Vision & Retina Consultation",
                doctor_name="Dr. Anil Gupta",
                department="Ophthalmology",
                diagnosis="6/6 Visual Acuity; Mild Computer Vision Syndrome",
                record_date="2026-10-21",
                status="Completed",
                notes="Advised 20-20-20 rule and lubricating eye drops.",
                file_name="Ophthalmology_Visit_Summary.pdf",
            ),
        ]
        db.add_all(sample_records)

    if db.query(Prescription).filter(Prescription.user_id == user.id).count() == 0:
        sample_prescriptions = [
            Prescription(
                user_id=user.id,
                medicine_name="Omega-3 Cardio Care 1000mg",
                dosage="1 Capsule",
                frequency="Once Daily (After Lunch)",
                duration="30 Days",
                instructions="Take with warm water after meal for cardiovascular support.",
                doctor_name="Dr. Santosh Rajab",
                specialization="Cardiology",
                prescribed_date="2026-10-28",
                status="Active",
            ),
            Prescription(
                user_id=user.id,
                medicine_name="Carboxymethylcellulose Eye Drops 0.5%",
                dosage="1-2 Drops",
                frequency="3 Times Daily",
                duration="15 Days",
                instructions="Use during screen work for soothing dry eyes.",
                doctor_name="Dr. Anil Gupta",
                specialization="Ophthalmology",
                prescribed_date="2026-10-21",
                status="Active",
            ),
        ]
        db.add_all(sample_prescriptions)

    if db.query(Notification).filter(Notification.user_id == user.id).count() == 0:
        sample_notifs = [
            Notification(
                user_id=user.id,
                category="Appointment Reminder",
                title="Upcoming Appointment with Dr. Santosh Rajab",
                message="Your Cardiology Onsite Consultation (Token SC-104) is Confirmed for 2026-11-06 at 10:00 AM.",
                time_label="10 mins ago",
                is_read=False,
            ),
            Notification(
                user_id=user.id,
                category="Report Availability",
                title="Lab Report Ready: CBC & Lipid Profile",
                message="Your Complete Blood Count (CBC) & Lipid Profile report has been verified and uploaded.",
                time_label="2 hours ago",
                is_read=False,
            ),
            Notification(
                user_id=user.id,
                category="Payment Update",
                title="Payment Pending for Invoice #INV-2026-109",
                message="Consultation fee of ₹800 for Cardiology Online Consultation is awaiting payment.",
                time_label="Yesterday",
                is_read=False,
            ),
        ]
        db.add_all(sample_notifs)

    if db.query(BillingRecord).filter(BillingRecord.user_id == user.id).count() == 0:
        sample_bills = [
            BillingRecord(
                user_id=user.id,
                invoice_no="INV-2026-109",
                service="Cardiology Online Consultation",
                doctor_name="Dr. Santosh Rajab",
                amount=800,
                bill_date="2026-11-04",
                payment_method="Pending Payment",
                status="Pending",
            ),
            BillingRecord(
                user_id=user.id,
                invoice_no="INV-2026-104",
                service="Cardiology Consultation & ECG Package",
                doctor_name="Dr. Santosh Rajab",
                amount=800,
                bill_date="2026-10-28",
                payment_method="UPI (Verified)",
                status="Paid",
            ),
        ]
        db.add_all(sample_bills)

    db.commit()


# ===========================================================================
# PATIENT ENDPOINTS
# ===========================================================================
@router.get("/patient/profile")
def get_patient_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    profile = db.query(PatientHealthProfile).filter(
        PatientHealthProfile.user_id == current_user.id
    ).first()

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "date_of_birth": profile.date_of_birth,
        "gender": profile.gender,
        "blood_group": profile.blood_group,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "allergies": profile.allergies,
        "chronic_conditions": profile.chronic_conditions,
        "emergency_contact_name": profile.emergency_contact_name,
        "emergency_contact_phone": profile.emergency_contact_phone,
        "address": profile.address,
        "insurance_provider": profile.insurance_provider,
    }


@router.put("/patient/profile")
def update_patient_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    profile = db.query(PatientHealthProfile).filter(
        PatientHealthProfile.user_id == current_user.id
    ).first()

    if payload.full_name:
        current_user.full_name = payload.full_name.strip()
    if payload.phone:
        current_user.phone = payload.phone.strip()

    for field in [
        "date_of_birth",
        "gender",
        "blood_group",
        "height_cm",
        "weight_kg",
        "allergies",
        "chronic_conditions",
        "emergency_contact_name",
        "emergency_contact_phone",
        "address",
        "insurance_provider",
    ]:
        val = getattr(payload, field)
        if val is not None:
            setattr(profile, field, val)

    db.commit()
    return {
        "message": "Health profile updated successfully!",
        "profile": get_patient_profile(current_user, db),
    }


@router.get("/doctors")
def get_doctors(
    specialization: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Only approved and active doctors appear in the Patient Dashboard."""
    ensure_schema_and_hospital_seeded(db)
    query = db.query(Doctor).filter(
        Doctor.is_approved == True,  # noqa: E712
        Doctor.available == True,  # noqa: E712
    )

    if specialization and specialization.lower() != "all":
        query = query.filter(Doctor.specialization.ilike(f"%{specialization}%"))

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Doctor.name.ilike(s)) |
            (Doctor.specialization.ilike(s)) |
            (Doctor.clinic.ilike(s))
        )

    doctors = query.order_by(Doctor.id.asc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "email": d.email,
            "phone": d.phone,
            "specialization": d.specialization,
            "qualification": d.qualification,
            "experience": d.experience,
            "medical_reg_no": d.medical_reg_no,
            "clinic": d.clinic,
            "room": d.room,
            "fee": d.fee,
            "schedule": d.schedule,
            "rating": d.rating,
            "avatar": d.avatar,
            "available": d.available,
            "slots": [
                "09:00 AM",
                "10:00 AM",
                "11:00 AM",
                "12:00 PM",
                "02:00 PM",
                "03:00 PM",
                "04:00 PM",
                "05:00 PM",
                "06:00 PM",
            ],
        }
        for d in doctors
    ]


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    ensure_schema_and_hospital_seeded(db)
    depts = db.query(Department).filter(Department.is_active == True).order_by(Department.id.asc()).all()  # noqa: E712
    return [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "head_doctor": d.head_doctor,
            "room_wing": d.room_wing,
        }
        for d in depts
    ]


@router.get("/appointments/my")
def get_my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    appts = (
        db.query(Appointment)
        .filter(Appointment.user_id == current_user.id)
        .order_by(Appointment.id.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "token_number": a.token_number or f"SC-{100 + a.id}",
            "doctor_id": a.doctor_id,
            "doctor_name": a.doctor_name,
            "specialization": a.specialization,
            "clinic": a.clinic,
            "consultation_mode": a.consultation_mode,
            "appointment_date": a.appointment_date,
            "appointment_time": a.appointment_time,
            "status": a.status,
            "symptoms": a.symptoms,
            "consultation_notes": a.consultation_notes,
            "prescription_summary": a.prescription_summary,
            "fee": a.fee,
        }
        for a in appts
    ]


@router.post("/appointments", status_code=201)
def book_appointment(
    payload: AppointmentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    profile = db.query(PatientHealthProfile).filter(PatientHealthProfile.user_id == current_user.id).first()

    # Verify selected doctor is approved
    doc = None
    if payload.doctor_id:
        doc = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doc:
        doc = db.query(Doctor).filter(Doctor.name == payload.doctor_name).first()
    if doc and not doc.is_approved:
        raise HTTPException(status_code=400, detail="Selected doctor is not approved yet.")

    count = db.query(Appointment).count()
    token_no = f"SC-{110 + count + 1}"

    new_appt = Appointment(
        user_id=current_user.id,
        patient_name=current_user.full_name,
        patient_email=current_user.email,
        patient_phone=current_user.phone,
        patient_age="26",
        patient_gender=profile.gender if profile else "Male",
        doctor_id=doc.id if doc else payload.doctor_id,
        doctor_name=doc.name if doc else payload.doctor_name,
        specialization=doc.specialization if doc else payload.specialization,
        clinic=payload.clinic,
        consultation_mode=payload.consultation_mode,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        status="Pending",
        symptoms=payload.symptoms or "General Consultation",
        token_number=token_no,
        fee=doc.fee if doc else payload.fee,
    )
    db.add(new_appt)

    invoice_no = f"INV-2026-{120 + count + 1}"
    db.add(
        BillingRecord(
            user_id=current_user.id,
            invoice_no=invoice_no,
            service=f"{new_appt.specialization} ({payload.consultation_mode})",
            doctor_name=new_appt.doctor_name,
            amount=new_appt.fee,
            bill_date=payload.appointment_date,
            payment_method="Pending Payment",
            status="Pending",
        )
    )

    db.add(
        Notification(
            user_id=current_user.id,
            category="Appointment Reminder",
            title=f"Appointment Request Sent ({token_no})",
            message=f"Your appointment request with {new_appt.doctor_name} ({new_appt.specialization}) for {payload.appointment_date} at {payload.appointment_time} has been sent to the doctor for confirmation.",
            time_label="Just now",
            is_read=False,
        )
    )

    db.commit()
    db.refresh(new_appt)

    return {
        "message": f"Appointment {token_no} booked! Doctor will review and confirm shortly.",
        "appointment": {
            "id": new_appt.id,
            "token_number": new_appt.token_number,
            "doctor_id": new_appt.doctor_id,
            "doctor_name": new_appt.doctor_name,
            "specialization": new_appt.specialization,
            "clinic": new_appt.clinic,
            "consultation_mode": new_appt.consultation_mode,
            "appointment_date": new_appt.appointment_date,
            "appointment_time": new_appt.appointment_time,
            "status": new_appt.status,
            "symptoms": new_appt.symptoms,
            "fee": new_appt.fee,
        },
    }


@router.put("/appointments/{appointment_id}/reschedule")
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentRescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appt = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.user_id == current_user.id)
        .first()
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.appointment_date = payload.appointment_date
    appt.appointment_time = payload.appointment_time
    if payload.consultation_mode:
        appt.consultation_mode = payload.consultation_mode
    if payload.clinic:
        appt.clinic = payload.clinic
    appt.status = "Pending"

    db.add(
        Notification(
            user_id=current_user.id,
            category="Appointment Reminder",
            title=f"Appointment Rescheduled ({appt.token_number})",
            message=f"Your appointment with {appt.doctor_name} has been rescheduled to {appt.appointment_date} at {appt.appointment_time}.",
            time_label="Just now",
            is_read=False,
        )
    )
    db.commit()
    db.refresh(appt)

    return {
        "message": "Appointment rescheduled successfully!",
        "appointment": {
            "id": appt.id,
            "token_number": appt.token_number,
            "doctor_name": appt.doctor_name,
            "specialization": appt.specialization,
            "clinic": appt.clinic,
            "consultation_mode": appt.consultation_mode,
            "appointment_date": appt.appointment_date,
            "appointment_time": appt.appointment_time,
            "status": appt.status,
            "symptoms": appt.symptoms,
            "fee": appt.fee,
        },
    }


@router.patch("/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = {"Pending", "Confirmed", "Completed", "Cancelled", "Rejected"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid appointment status")

    appt = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.user_id == current_user.id)
        .first()
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = payload.status

    db.add(
        Notification(
            user_id=current_user.id,
            category="Appointment Reminder",
            title=f"Appointment Status Updated: {payload.status}",
            message=f"Appointment {appt.token_number} with {appt.doctor_name} is now {payload.status}.",
            time_label="Just now",
            is_read=False,
        )
    )
    db.commit()
    db.refresh(appt)

    return {
        "message": f"Appointment marked as {payload.status}.",
        "appointment": {
            "id": appt.id,
            "token_number": appt.token_number,
            "doctor_name": appt.doctor_name,
            "specialization": appt.specialization,
            "clinic": appt.clinic,
            "consultation_mode": appt.consultation_mode,
            "appointment_date": appt.appointment_date,
            "appointment_time": appt.appointment_time,
            "status": appt.status,
            "symptoms": appt.symptoms,
            "fee": appt.fee,
        },
    }


@router.get("/medical-records")
def get_medical_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    records = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.user_id == current_user.id)
        .order_by(MedicalRecord.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "record_type": r.record_type,
            "title": r.title,
            "doctor_name": r.doctor_name,
            "department": r.department,
            "diagnosis": r.diagnosis,
            "record_date": r.record_date,
            "status": r.status,
            "notes": r.notes,
            "file_name": r.file_name,
        }
        for r in records
    ]


@router.post("/medical-records", status_code=201)
def create_medical_record(
    payload: MedicalRecordCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today_str = payload.record_date or datetime.now().strftime("%Y-%m-%d")
    new_rec = MedicalRecord(
        user_id=current_user.id,
        record_type=payload.record_type,
        title=payload.title,
        doctor_name=payload.doctor_name,
        department=payload.department,
        diagnosis=payload.diagnosis,
        record_date=today_str,
        status="Available",
        notes=payload.notes,
        file_name=payload.file_name or "Medical_Report.pdf",
    )
    db.add(new_rec)
    db.add(
        Notification(
            user_id=current_user.id,
            category="Report Availability",
            title=f"New {payload.record_type} Uploaded",
            message=f"{payload.title} ({payload.department}) is now available in your Digital Health Records.",
            time_label="Just now",
            is_read=False,
        )
    )
    db.commit()
    db.refresh(new_rec)

    return {"message": "Medical record added successfully!", "record": {"id": new_rec.id, "title": new_rec.title}}


@router.get("/prescriptions")
def get_prescriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    items = (
        db.query(Prescription)
        .filter(Prescription.user_id == current_user.id)
        .order_by(Prescription.id.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "medicine_name": p.medicine_name,
            "dosage": p.dosage,
            "frequency": p.frequency,
            "duration": p.duration,
            "instructions": p.instructions,
            "doctor_name": p.doctor_name,
            "specialization": p.specialization,
            "prescribed_date": p.prescribed_date,
            "status": p.status,
        }
        for p in items
    ]


@router.get("/notifications")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.id.desc())
        .all()
    )
    return [
        {
            "id": n.id,
            "category": n.category,
            "title": n.title,
            "message": n.message,
            "time_label": n.time_label,
            "is_read": n.is_read,
        }
        for n in notifs
    ]


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read", "id": notif.id}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Notification).filter(Notification.user_id == current_user.id).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.get("/billing")
def get_billing_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_patient_seeded(db, current_user)
    bills = (
        db.query(BillingRecord)
        .filter(BillingRecord.user_id == current_user.id)
        .order_by(BillingRecord.id.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "invoice_no": b.invoice_no,
            "service": b.service,
            "doctor_name": b.doctor_name,
            "amount": b.amount,
            "bill_date": b.bill_date,
            "payment_method": b.payment_method,
            "status": b.status,
        }
        for b in bills
    ]


@router.post("/billing/{bill_id}/pay")
def pay_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bill = (
        db.query(BillingRecord)
        .filter(BillingRecord.id == bill_id, BillingRecord.user_id == current_user.id)
        .first()
    )
    if not bill:
        raise HTTPException(status_code=404, detail="Invoice not found")

    bill.status = "Paid"
    bill.payment_method = "SmartCare Instant Pay (UPI)"

    db.add(
        Notification(
            user_id=current_user.id,
            category="Payment Update",
            title=f"Payment Successful ({bill.invoice_no})",
            message=f"Payment of ₹{bill.amount} for {bill.service} with {bill.doctor_name} has been confirmed.",
            time_label="Just now",
            is_read=False,
        )
    )
    db.commit()
    return {"message": f"Invoice {bill.invoice_no} paid successfully!"}


@router.get("/support/tickets")
def get_support_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(SupportTicket)
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.id.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "ticket_no": t.ticket_no,
            "category": t.category,
            "subject": t.subject,
            "description": t.description,
            "status": t.status,
            "created_date": t.created_date,
        }
        for t in tickets
    ]


@router.post("/support/tickets", status_code=201)
def create_support_ticket(
    payload: SupportTicketCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(SupportTicket).count()
    ticket = SupportTicket(
        user_id=current_user.id,
        ticket_no=f"TKT-{200 + count + 1}",
        category=payload.category,
        subject=payload.subject,
        description=payload.description,
        status="Open",
        created_date=datetime.now().strftime("%Y-%m-%d"),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {"message": f"Support ticket {ticket.ticket_no} submitted!", "ticket": {"id": ticket.id}}


@router.post("/ai-assistant/chat")
def ai_health_assistant_chat(
    payload: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = payload.message.strip().lower()
    if any(w in q for w in ["vital", "bp", "blood pressure", "heart", "ecg", "status"]):
        reply = (
            "Your latest recorded vitals in SmartCare are within healthy ranges: "
            "Resting Heart Rate 74 BPM (Normal Sinus Rhythm), LVEF 62%, and Hemoglobin 14.6 g/dL."
        )
    elif any(w in q for w in ["visit", "hour", "timing", "navigation", "where", "wing", "room"]):
        reply = (
            "SmartCare OPD hours are Monday to Saturday, 09:00 AM – 07:00 PM. "
            "Cardiology is in Wing A (Room 101), Neurology in Wing B (Room 204), and Eye Care on the Ground Floor (Room 004)."
        )
    elif any(w in q for w in ["next", "appointment", "doctor", "reschedule", "book"]):
        reply = (
            "You can book an appointment with any verified SmartCare specialist in the 'Book Appointment' tab. "
            "Once booked, the doctor reviews your request and you receive an instant notification when accepted!"
        )
    elif any(w in q for w in ["med", "prescription", "tablet", "capsule", "drop", "dosage"]):
        reply = (
            "Your active prescriptions are listed under 'My Prescriptions' with exact dosage, frequency, and meal instructions."
        )
    else:
        reply = (
            f"Hello {current_user.full_name}! I'm Luna, your SmartCare AI Health Assistant. "
            "I can help explain your lab reports, active prescriptions, hospital wings, or appointment status."
        )

    return {
        "assistant": "Luna • SmartCare AI",
        "reply": reply,
        "timestamp": datetime.now().strftime("%I:%M %p"),
    }


# ===========================================================================
# DOCTOR DASHBOARD ENDPOINTS (ROLE-PROTECTED)
# ===========================================================================
def _get_or_link_doctor_profile(db: Session, current_user: User) -> Doctor:
    ensure_schema_and_hospital_seeded(db)
    doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doc:
        doc = db.query(Doctor).filter(Doctor.email == current_user.email).first()
        if doc:
            doc.user_id = current_user.id
            db.commit()
    if not doc:
        # Fallback if a doctor account was created earlier without a Doctor row
        doc = Doctor(
            user_id=current_user.id,
            name=current_user.full_name if current_user.full_name.startswith("Dr") else f"Dr. {current_user.full_name}",
            email=current_user.email,
            phone=current_user.phone,
            specialization="Cardiology",
            qualification="MBBS, MD",
            experience="8 Years",
            medical_reg_no=f"MCI-2026-{1000 + current_user.id}",
            clinic="SmartCare Super-Specialty Hospital",
            room="Wing A • Room 102",
            fee=750,
            schedule="Mon - Sat • 09:00 AM - 05:00 PM",
            rating="4.9",
            avatar="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80",
            available=True,
            is_approved=current_user.is_approved,
            approval_status="approved" if current_user.is_approved else "pending",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    return doc


@router.get("/doctor/dashboard")
def get_doctor_dashboard(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doc = _get_or_link_doctor_profile(db, current_user)

    # Fetch all appointments linked to this doctor
    appts = (
        db.query(Appointment)
        .filter(
            (Appointment.doctor_id == doc.id) |
            (Appointment.doctor_name.ilike(f"%{doc.name}%"))
        )
        .order_by(Appointment.id.desc())
        .all()
    )

    # If this doctor has 0 appointments yet, seed 3 sample patient appointments so Doctor Dashboard looks complete
    if len(appts) == 0:
        patient_user = db.query(User).filter(User.role == "patient").first()
        p_id = patient_user.id if patient_user else current_user.id
        p_name = patient_user.full_name if patient_user else "Peteroozer Sharma"
        p_email = patient_user.email if patient_user else "patient@smartcare.com"
        p_phone = patient_user.phone if patient_user else "9876543210"

        seeded = [
            Appointment(
                user_id=p_id,
                patient_name=p_name,
                patient_email=p_email,
                patient_phone=p_phone,
                patient_age="29",
                patient_gender="Male",
                doctor_id=doc.id,
                doctor_name=doc.name,
                specialization=doc.specialization,
                clinic=doc.clinic,
                consultation_mode="Onsite Consultation",
                appointment_date="2026-11-05",
                appointment_time="10:00 AM",
                status="Pending",
                symptoms="Chest discomfort & blood pressure fluctuation",
                token_number="APT-0001",
                fee=doc.fee,
            ),
            Appointment(
                user_id=p_id,
                patient_name="Suman Roy",
                patient_email="suman.roy@smartcare.com",
                patient_phone="9811223344",
                patient_age="34",
                patient_gender="Female",
                doctor_id=doc.id,
                doctor_name=doc.name,
                specialization=doc.specialization,
                clinic=doc.clinic,
                consultation_mode="Online Consultation",
                appointment_date="2026-11-06",
                appointment_time="11:30 AM",
                status="Confirmed",
                symptoms="Routine follow-up & ECG report review",
                token_number="APT-0002",
                fee=doc.fee,
            ),
            Appointment(
                user_id=p_id,
                patient_name="Riya Gupta",
                patient_email="riya.gupta@smartcare.com",
                patient_phone="9822334455",
                patient_age="41",
                patient_gender="Female",
                doctor_id=doc.id,
                doctor_name=doc.name,
                specialization=doc.specialization,
                clinic=doc.clinic,
                consultation_mode="Onsite Consultation",
                appointment_date="2026-10-29",
                appointment_time="02:00 PM",
                status="Completed",
                symptoms="Annual health checkup & lipid profile discussion",
                consultation_notes="Vitals stable. Advised low-sodium diet and daily 30-min brisk walk.",
                prescription_summary="Omega-3 Cardio Care 1000mg - Once Daily",
                token_number="APT-0003",
                fee=doc.fee,
            ),
        ]
        db.add_all(seeded)
        db.commit()
        appts = (
            db.query(Appointment)
            .filter(Appointment.doctor_id == doc.id)
            .order_by(Appointment.id.desc())
            .all()
        )

    # Enrich appointments with patient details & authorized medical history
    enriched_appts = []
    patients_map = {}

    for a in appts:
        pat_user = db.query(User).filter(User.id == a.user_id).first()
        pat_prof = db.query(PatientHealthProfile).filter(PatientHealthProfile.user_id == a.user_id).first()
        pat_records = db.query(MedicalRecord).filter(MedicalRecord.user_id == a.user_id).order_by(MedicalRecord.id.desc()).all()

        p_name = a.patient_name or (pat_user.full_name if pat_user else "SmartCare Patient")
        p_email = a.patient_email or (pat_user.email if pat_user else "patient@smartcare.com")
        p_phone = a.patient_phone or (pat_user.phone if pat_user else "9876543210")
        p_gender = a.patient_gender or (pat_prof.gender if pat_prof else "Male")
        p_blood = pat_prof.blood_group if pat_prof else "O+"
        p_allergies = pat_prof.allergies if pat_prof else "None reported"
        p_chronic = pat_prof.chronic_conditions if pat_prof else "None"

        item = {
            "id": a.id,
            "token_number": a.token_number or f"APT-{1000 + a.id}",
            "patient_id": a.user_id,
            "patient_name": p_name,
            "patient_email": p_email,
            "patient_phone": p_phone,
            "patient_age": a.patient_age or "28",
            "patient_gender": p_gender,
            "blood_group": p_blood,
            "allergies": p_allergies,
            "chronic_conditions": p_chronic,
            "consultation_mode": a.consultation_mode,
            "clinic": a.clinic,
            "appointment_date": a.appointment_date,
            "appointment_time": a.appointment_time,
            "status": a.status,
            "symptoms": a.symptoms or "General Consultation",
            "consultation_notes": a.consultation_notes or "",
            "prescription_summary": a.prescription_summary or "",
            "fee": a.fee,
            "medical_history": [
                {
                    "id": r.id,
                    "record_type": r.record_type,
                    "title": r.title,
                    "diagnosis": r.diagnosis,
                    "record_date": r.record_date,
                }
                for r in pat_records[:5]
            ],
        }
        enriched_appts.append(item)

        if p_name not in patients_map:
            patients_map[p_name] = {
                "patient_id": a.user_id,
                "name": p_name,
                "email": p_email,
                "phone": p_phone,
                "age": a.patient_age or "28",
                "gender": p_gender,
                "blood_group": p_blood,
                "allergies": p_allergies,
                "chronic_conditions": p_chronic,
                "last_visit": a.appointment_date,
                "total_visits": 1,
                "medical_history": item["medical_history"],
            }
        else:
            patients_map[p_name]["total_visits"] += 1

    return {
        "doctor": {
            "id": doc.id,
            "user_id": doc.user_id,
            "name": doc.name,
            "email": doc.email or current_user.email,
            "phone": doc.phone or current_user.phone,
            "specialization": doc.specialization,
            "qualification": doc.qualification,
            "experience": doc.experience,
            "medical_reg_no": doc.medical_reg_no,
            "clinic": doc.clinic,
            "room": doc.room,
            "fee": doc.fee,
            "schedule": doc.schedule,
            "rating": doc.rating,
            "avatar": doc.avatar,
            "available": doc.available,
            "is_approved": doc.is_approved,
        },
        "stats": {
            "total_appointments": len(enriched_appts),
            "pending_requests": len([x for x in enriched_appts if x["status"] == "Pending"]),
            "upcoming_confirmed": len([x for x in enriched_appts if x["status"] == "Confirmed"]),
            "completed_visits": len([x for x in enriched_appts if x["status"] == "Completed"]),
            "total_patients": len(patients_map),
        },
        "appointments": enriched_appts,
        "patients": list(patients_map.values()),
    }


@router.patch("/doctor/appointments/{appointment_id}/decision")
def doctor_appointment_decision(
    appointment_id: int,
    payload: DoctorDecisionRequest,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doc = _get_or_link_doctor_profile(db, current_user)
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.doctor_id != doc.id and doc.name.lower() not in (appt.doctor_name or "").lower():
        raise HTTPException(status_code=403, detail="Unauthorized: Appointment does not belong to this doctor")

    if payload.status not in ("Confirmed", "Rejected", "Completed", "Cancelled"):
        raise HTTPException(status_code=400, detail="Invalid decision status")

    appt.status = payload.status
    if payload.consultation_notes:
        appt.consultation_notes = payload.consultation_notes

    # Notify Patient automatically
    status_label = "Accepted & Confirmed" if payload.status == "Confirmed" else payload.status
    db.add(
        Notification(
            user_id=appt.user_id,
            category="Appointment Reminder",
            title=f"Doctor {status_label} Appointment ({appt.token_number})",
            message=f"{doc.name} ({doc.specialization}) has {status_label.lower()} your appointment for {appt.appointment_date} at {appt.appointment_time}.",
            time_label="Just now",
            is_read=False,
        )
    )
    db.commit()

    return {
        "message": f"Appointment {appt.token_number} marked as {payload.status} and patient notified!",
        "status": appt.status,
    }


@router.post("/doctor/appointments/{appointment_id}/prescribe")
def doctor_add_prescription_and_notes(
    appointment_id: int,
    payload: DoctorPrescriptionRequest,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doc = _get_or_link_doctor_profile(db, current_user)
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.doctor_id != doc.id and doc.name.lower() not in (appt.doctor_name or "").lower():
        raise HTTPException(status_code=403, detail="Unauthorized access to patient appointment")

    today_str = datetime.now().strftime("%Y-%m-%d")

    appt.status = "Completed"
    appt.consultation_notes = payload.consultation_notes
    appt.prescription_summary = f"{payload.medicine_name} ({payload.dosage}, {payload.frequency} for {payload.duration})"

    # Save Prescription for the Patient
    db.add(
        Prescription(
            user_id=appt.user_id,
            medicine_name=payload.medicine_name,
            dosage=payload.dosage,
            frequency=payload.frequency,
            duration=payload.duration,
            instructions=payload.instructions,
            doctor_name=doc.name,
            specialization=doc.specialization,
            prescribed_date=today_str,
            status="Active",
        )
    )

    # Save Consultation Record in Patient's Digital Health Records
    db.add(
        MedicalRecord(
            user_id=appt.user_id,
            record_type="Consultation History",
            title=f"{doc.specialization} Consultation & Prescription ({appt.token_number})",
            doctor_name=doc.name,
            department=doc.specialization,
            diagnosis=payload.diagnosis,
            record_date=today_str,
            status="Completed",
            notes=f"{payload.consultation_notes} | Rx: {appt.prescription_summary}",
            file_name=f"Prescription_{appt.token_number}.pdf",
        )
    )

    # Send Smart Notification to Patient
    db.add(
        Notification(
            user_id=appt.user_id,
            category="Report Availability",
            title=f"New Prescription & Consultation Notes from {doc.name}",
            message=f"{doc.name} completed your consultation ({appt.token_number}) and added prescription '{payload.medicine_name}'.",
            time_label="Just now",
            is_read=False,
        )
    )

    db.commit()
    return {
        "message": "Consultation notes and prescription saved to patient's records!",
    }


@router.put("/doctor/availability")
def update_doctor_availability(
    payload: DoctorAvailabilityRequest,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    doc = _get_or_link_doctor_profile(db, current_user)
    doc.available = payload.available
    doc.schedule = payload.schedule
    doc.fee = payload.fee
    if payload.clinic:
        doc.clinic = payload.clinic
    if payload.room:
        doc.room = payload.room
    if payload.qualification:
        doc.qualification = payload.qualification
    if payload.experience:
        doc.experience = payload.experience

    db.commit()
    return {
        "message": "Doctor availability, schedule & consultation fee updated!",
    }


# ===========================================================================
# SUPER ADMIN DASHBOARD ENDPOINTS (ROLE-PROTECTED)
# ===========================================================================
@router.get("/admin/dashboard")
def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_schema_and_hospital_seeded(db)

    all_users = db.query(User).order_by(User.id.desc()).all()
    all_doctors = db.query(Doctor).order_by(Doctor.id.desc()).all()
    approved_docs = [d for d in all_doctors if d.is_approved]
    pending_docs = [d for d in all_doctors if d.approval_status == "pending"]

    all_patients = [u for u in all_users if u.role == "patient"]
    all_appts = db.query(Appointment).order_by(Appointment.id.desc()).all()
    depts = db.query(Department).order_by(Department.id.asc()).all()

    return {
        "stats": {
            "total_users": len(all_users),
            "total_doctors": len(approved_docs),
            "pending_approvals": len(pending_docs),
            "total_patients": len(all_patients),
            "total_appointments": len(all_appts),
            "total_departments": len(depts),
        },
        "users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "role": u.role,
                "is_active": u.is_active,
                "is_approved": u.is_approved,
                "created_at": u.created_at.strftime("%b %d, %Y") if u.created_at else "Nov 2026",
            }
            for u in all_users
        ],
        "pending_doctors": [
            {
                "id": d.id,
                "user_id": d.user_id,
                "name": d.name,
                "email": d.email,
                "phone": d.phone,
                "specialization": d.specialization,
                "qualification": d.qualification,
                "experience": d.experience,
                "medical_reg_no": d.medical_reg_no,
                "fee": d.fee,
                "avatar": d.avatar,
                "applied_date": d.applied_date or "Nov 2, 2026",
                "approval_status": d.approval_status,
            }
            for d in pending_docs
        ],
        "doctors": [
            {
                "id": d.id,
                "user_id": d.user_id,
                "name": d.name,
                "email": d.email,
                "phone": d.phone,
                "specialization": d.specialization,
                "qualification": d.qualification,
                "experience": d.experience,
                "medical_reg_no": d.medical_reg_no,
                "clinic": d.clinic,
                "room": d.room,
                "fee": d.fee,
                "schedule": d.schedule,
                "available": d.available,
                "is_approved": d.is_approved,
                "approval_status": d.approval_status,
                "applied_date": d.applied_date or "Oct 2026",
                "avatar": d.avatar,
            }
            for d in all_doctors
        ],
        "patients": [
            {
                "id": p.id,
                "full_name": p.full_name,
                "email": p.email,
                "phone": p.phone,
                "role": p.role,
                "is_active": p.is_active,
                "created_at": p.created_at.strftime("%b %d, %Y") if p.created_at else "Nov 2026",
            }
            for p in all_patients
        ],
        "appointments": [
            {
                "id": a.id,
                "token_number": a.token_number or f"SC-{100 + a.id}",
                "patient_name": a.patient_name or "SmartCare Patient",
                "doctor_name": a.doctor_name,
                "specialization": a.specialization,
                "appointment_date": a.appointment_date,
                "appointment_time": a.appointment_time,
                "consultation_mode": a.consultation_mode,
                "status": a.status,
                "fee": a.fee,
            }
            for a in all_appts
        ],
        "departments": [
            {
                "id": dp.id,
                "name": dp.name,
                "description": dp.description,
                "head_doctor": dp.head_doctor,
                "room_wing": dp.room_wing,
                "is_active": dp.is_active,
            }
            for dp in depts
        ],
        "weekly_overview": [
            {"day": "Mon", "count": 115},
            {"day": "Tue", "count": 152},
            {"day": "Wed", "count": 134},
            {"day": "Thu", "count": 188},
            {"day": "Fri", "count": 215},
            {"day": "Sat", "count": 176},
            {"day": "Sun", "count": 260},
        ],
        "department_breakdown": [
            {"name": "Cardiology", "percent": 28, "color": "#2563eb"},
            {"name": "Orthopedics", "percent": 18, "color": "#10b981"},
            {"name": "Neurology", "percent": 16, "color": "#06b6d4"},
            {"name": "Ophthalmology", "percent": 12, "color": "#f59e0b"},
            {"name": "General Medicine", "percent": 26, "color": "#6366f1"},
        ],
    }


@router.post("/admin/doctors/{doctor_id}/approve")
def admin_approve_doctor(
    doctor_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor record not found")

    doc.is_approved = True
    doc.approval_status = "approved"
    doc.available = True

    if doc.user_id:
        u = db.query(User).filter(User.id == doc.user_id).first()
        if u:
            u.is_approved = True
            u.is_active = True

    db.commit()
    return {
        "message": f"{doc.name} ({doc.specialization}) has been approved and is now live on the Patient Dashboard!",
    }


@router.post("/admin/doctors/{doctor_id}/reject")
def admin_reject_doctor(
    doctor_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor record not found")

    doc.is_approved = False
    doc.approval_status = "rejected"
    doc.available = False

    if doc.user_id:
        u = db.query(User).filter(User.id == doc.user_id).first()
        if u:
            u.is_approved = False

    db.commit()
    return {
        "message": f"{doc.name}'s registration has been rejected.",
    }


@router.patch("/admin/doctors/{doctor_id}/toggle-availability")
def admin_toggle_doctor_status(
    doctor_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc.available = not doc.available
    db.commit()
    return {
        "message": f"{doc.name} is now {'Active' if doc.available else 'Inactive'}.",
        "available": doc.available,
    }


@router.patch("/admin/users/{user_id}/toggle-active")
def admin_toggle_user_account(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot deactivate Super Admin")

    target.is_active = not target.is_active
    db.commit()
    return {
        "message": f"Account {target.full_name} is now {'Active' if target.is_active else 'Deactivated'}.",
        "is_active": target.is_active,
    }


@router.get("/admin/users")
def admin_get_all_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.id.desc()).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "is_approved": u.is_approved,
            "created_at": u.created_at.strftime("%b %d, %Y") if u.created_at else "Nov 2026",
        }
        for u in users
    ]


@router.post("/admin/users", status_code=201)
def admin_create_user(
    payload: AdminUserCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    normalized_email = payload.email.strip().lower()
    normalized_phone = payload.phone.strip()

    if not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    existing_user = db.query(User).filter(
        (User.email == normalized_email) | (User.phone == normalized_phone)
    ).first()

    if existing_user:
        if existing_user.email == normalized_email:
            raise HTTPException(status_code=400, detail="Email is already registered")
        raise HTTPException(status_code=400, detail="Phone number is already registered")

    role_lower = payload.role.strip().lower()
    if role_lower not in ("patient", "doctor", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role specified. Must be patient, doctor, or admin")

    display_name = payload.full_name.strip()
    is_doctor = role_lower == "doctor"
    if is_doctor and not display_name.lower().startswith("dr"):
        display_name = f"Dr. {display_name}"

    new_user = User(
        full_name=display_name,
        email=normalized_email,
        phone=normalized_phone,
        hashed_password=hash_password(payload.password),
        role=role_lower,
        is_active=True,
        is_approved=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if is_doctor:
        reg_no = payload.medical_reg_no or f"MCI-2026-{1000 + new_user.id}"
        new_doc = Doctor(
            user_id=new_user.id,
            name=display_name,
            email=normalized_email,
            phone=normalized_phone,
            specialization=payload.specialization or "General Medicine",
            qualification=payload.qualification or "MBBS, MD",
            experience=payload.experience or "5 Years",
            medical_reg_no=reg_no,
            clinic="SmartCare Super-Specialty Hospital",
            room="OPD Wing A",
            fee=payload.fee or 700,
            schedule="Mon - Sat • 09:00 AM - 05:00 PM",
            rating="4.8",
            avatar="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80",
            available=True,
            is_approved=True,
            approval_status="approved",
            applied_date=datetime.now().strftime("%b %d, %Y"),
        )
        db.add(new_doc)
        db.commit()
    elif role_lower == "patient":
        profile = PatientHealthProfile(
            user_id=new_user.id,
            date_of_birth="1998-01-01",
            gender="Not Specified",
            blood_group="O+",
            height_cm="170 cm",
            weight_kg="65 kg",
            allergies="None",
            chronic_conditions="None",
            emergency_contact_name="Family Member",
            emergency_contact_phone=normalized_phone,
            address="SmartCare Patient Residency",
            insurance_provider="SmartCare Gold Cover",
        )
        db.add(profile)
        db.commit()

    return {
        "message": f"User '{display_name}' ({role_lower.capitalize()}) created successfully!",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "phone": new_user.phone,
            "role": new_user.role,
            "is_active": new_user.is_active,
            "is_approved": new_user.is_approved,
            "created_at": new_user.created_at.strftime("%b %d, %Y") if new_user.created_at else datetime.now().strftime("%b %d, %Y"),
        }
    }


@router.post("/admin/departments", status_code=201)
def admin_create_department(
    payload: DepartmentCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Department).filter(Department.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")

    dept = Department(
        name=payload.name.strip(),
        description=payload.description.strip(),
        head_doctor=payload.head_doctor,
        room_wing=payload.room_wing,
        is_active=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {
        "message": f"Department '{dept.name}' added successfully!",
        "department": {
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "head_doctor": dept.head_doctor,
            "room_wing": dept.room_wing,
        },
    }


@router.delete("/admin/departments/{dept_id}")
def admin_delete_department(
    dept_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": f"Department '{dept.name}' removed."}
