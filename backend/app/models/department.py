from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(300), nullable=False)
    head_doctor = Column(String(120), nullable=True)
    room_wing = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
