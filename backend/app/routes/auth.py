from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.database import SessionLocal
from app.models.user import User
from app.models.doctor import Doctor
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security_scheme = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
        )

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    role_norm = (current_user.role or "").strip().lower().replace("_", "").replace("-", "").replace(" ", "")
    if role_norm not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin permissions required",
        )
    return current_user


def require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("doctor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authorized Doctor access required",
        )
    return current_user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user.email.strip().lower()
    normalized_phone = user.phone.strip()

    existing_user = db.query(User).filter(
        (User.email == normalized_email) |
        (User.phone == normalized_phone)
    ).first()

    if existing_user:
        if existing_user.email == normalized_email:
            raise HTTPException(
                status_code=400,
                detail="Email is already registered"
            )
        raise HTTPException(
            status_code=400,
            detail="Phone number is already registered"
        )

    role_lower = user.role.lower()
    is_doctor = role_lower == "doctor"

    # Doctors require Super Admin approval before login/appearing in Patient Dashboard
    is_approved = False if is_doctor else True

    display_name = user.full_name.strip()
    if is_doctor and not display_name.lower().startswith("dr"):
        display_name = f"Dr. {display_name}"

    new_user = User(
        full_name=display_name,
        email=normalized_email,
        phone=normalized_phone,
        hashed_password=hash_password(user.password),
        role=role_lower,
        is_active=True,
        is_approved=is_approved,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if is_doctor:
        reg_no = (
            user.medical_registration_number
            or user.employee_id
            or f"MCI-2026-{1000 + new_user.id}"
        )
        new_doc = Doctor(
            user_id=new_user.id,
            name=display_name,
            email=normalized_email,
            phone=normalized_phone,
            specialization=user.specialization or "General Medicine",
            qualification=user.qualification or "MBBS, MD",
            experience=user.experience or "5 Years",
            medical_reg_no=reg_no,
            clinic="SmartCare Super-Specialty Hospital",
            room="OPD Wing A",
            fee=user.consultation_fee or 700,
            schedule="Mon - Sat • 09:00 AM - 05:00 PM",
            rating="4.8",
            avatar="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80",
            available=True,
            is_approved=False,
            approval_status="pending",
            applied_date=datetime.now().strftime("%b %d, %Y"),
        )
        db.add(new_doc)
        db.commit()

    response_msg = (
        "Doctor registration submitted! Your account requires Super Admin approval before login."
        if is_doctor
        else "Registration successful! Please login."
    )

    return UserResponse(
        id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        phone=new_user.phone,
        role=new_user.role,
        is_active=new_user.is_active,
        is_approved=new_user.is_approved,
        message=response_msg,
    )


@router.post("/login")
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    normalized_email = user.email.strip().lower()

    existing_user = db.query(User).filter(
        User.email == normalized_email
    ).first()

    if not existing_user or not verify_password(
        user.password,
        existing_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not existing_user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated by Admin."
        )

    if existing_user.role == "doctor" and not existing_user.is_approved:
        doc_rec = db.query(Doctor).filter(Doctor.user_id == existing_user.id).first()
        if doc_rec and doc_rec.approval_status == "rejected":
            raise HTTPException(
                status_code=403,
                detail="Your doctor registration was rejected by Super Admin."
            )
        raise HTTPException(
            status_code=403,
            detail="Your Doctor account is pending Super Admin approval."
        )

    token = create_access_token({
        "sub": str(existing_user.id),
        "email": existing_user.email,
        "role": existing_user.role,
        "full_name": existing_user.full_name,
    })

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": existing_user.id,
            "full_name": existing_user.full_name,
            "email": existing_user.email,
            "phone": existing_user.phone,
            "role": existing_user.role,
            "is_active": existing_user.is_active,
            "is_approved": existing_user.is_approved,
        },
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
