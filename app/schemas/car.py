from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class CarBase(BaseModel):
    name: str
    brand: str
    model: str
    price: float
    year: int
    category: str
    features: Dict[str, Any] = {}
    image_url: Optional[str] = None


class CarCreate(CarBase):
    pass


class CarUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    price: Optional[float] = None
    year: Optional[int] = None
    category: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None


class CarInDB(CarBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class Car(CarInDB):
    pass


class CarWithInterest(Car):
    interest_score: float = Field(..., ge=0, le=100)

    class Config:
        from_attributes = True