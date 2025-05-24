from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime


class ClientBase(BaseModel):
    first_name: str
    last_name: str
    gender: str
    age: int
    phone: Optional[str] = None
    interests: Optional[str] = None
    budget: Optional[float] = None
    marital_status: Optional[str] = None
    job_title: Optional[str] = None
    has_car: bool = False
    has_credit: Optional[str] = None
    family_members: int = 0
    is_student: bool = False
    workplace: Optional[str] = None
    purpose: Optional[str] = None  # Tashrif maqsadi

    @validator('gender')
    def validate_gender(cls, v):
        valid_genders = ['Male', 'Female']
        if v not in valid_genders:
            raise ValueError(f'Gender must be one of: {", ".join(valid_genders)}')
        return v

    @validator('has_credit')
    def validate_has_credit(cls, v):
        if v is not None and v != "":
            valid_options = ['Yes', 'No']
            if v not in valid_options:
                raise ValueError(f'Has credit must be one of: {", ".join(valid_options)}')
        return v

    @validator('purpose')
    def validate_purpose(cls, v):
        if v is not None and v != "":
            valid_purposes = [
                'View new cars', 
                'Access services', 
                'Schedule test drive', 
                'Manage documents', 
                'Get information', 
                'Purchase car', 
                'Other'
            ]
            if v not in valid_purposes:
                raise ValueError(f'Purpose must be one of: {", ".join(valid_purposes)}')
        return v


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    interests: Optional[str] = None
    budget: Optional[float] = None
    marital_status: Optional[str] = None
    job_title: Optional[str] = None
    has_car: Optional[bool] = None
    has_credit: Optional[str] = None
    family_members: Optional[int] = None
    is_student: Optional[bool] = None
    workplace: Optional[str] = None
    purpose: Optional[str] = None  # Tashrif maqsadi


class ClientInDB(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Client(ClientInDB):
    pass


class ClientWithVisits(Client):
    visits: List["VisitBase"] = []

    class Config:
        from_attributes = True 