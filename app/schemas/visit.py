from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


class VisitBase(BaseModel):
    entry_time: datetime
    exit_time: Optional[datetime] = None
    purpose: Optional[str] = None
    recommendations: Optional[Any] = None
    
    # Recommendations uchun validator qo'shish
    @validator('recommendations', pre=True)
    def parse_recommendations(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return None
        return v


class VisitCreate(VisitBase):
    client_id: int


class VisitUpdate(BaseModel):
    exit_time: Optional[datetime] = None
    purpose: Optional[str] = None
    recommendations: Optional[Any] = None
    
    # Recommendations uchun validator qo'shish
    @validator('recommendations', pre=True)
    def parse_recommendations(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except:
                return None
        return v


class VisitInDB(VisitBase):
    id: int
    client_id: int

    class Config:
        orm_mode = True
        from_attributes = True


class Visit(VisitInDB):
    pass


# For circular imports
from app.schemas.client import Client


class VisitWithClient(Visit):
    client: Client

    class Config:
        orm_mode = True
        from_attributes = True 