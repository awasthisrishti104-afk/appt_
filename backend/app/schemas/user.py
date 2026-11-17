from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Literal, Optional


class UserCreate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=50)
    last_name: Optional[str] = Field(default=None, max_length=50)
    full_name: Optional[str] = Field(default=None, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)

    role: Literal[
        "patient",
        "doctor",
        "admin",
        "receptionist"
    ] = "patient"

    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    employee_id: Optional[str] = None

    # Doctor-specific registration fields
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    medical_registration_number: Optional[str] = None
    consultation_fee: Optional[int] = 700

    @model_validator(mode="after")
    def build_full_name(self):
        if not self.full_name:
            parts = [
                (self.first_name or "").strip(),
                (self.last_name or "").strip(),
            ]
            combined = " ".join(p for p in parts if p)
            if not combined:
                raise ValueError("First name and last name are required")
            self.full_name = combined
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    role: str
    is_active: bool
    is_approved: bool
    message: str = "Registration successful! Please login."

    model_config = {
        "from_attributes": True
    }
