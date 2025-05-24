from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
import json

from app.db.base import get_db
from app.models.models import Car
from app.schemas.car import CarCreate, CarUpdate, Car as CarSchema

router = APIRouter()


@router.get("/", response_model=List[CarSchema])
def read_cars(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> Any:
    """
    Retrieve cars.
    """
    cars = db.query(Car).offset(skip).limit(limit).all()
    return cars


@router.post("/", response_model=CarSchema)
def create_car(
    *,
    db: Session = Depends(get_db),
    car_in: CarCreate
) -> Any:
    """
    Create new car.
    """
    # Convert features dict to JSON string
    features_str = json.dumps(car_in.features) if car_in.features else "{}"
    
    car = Car(
        name=car_in.name,
        brand=car_in.brand,
        model=car_in.model,
        price=car_in.price,
        year=car_in.year,
        category=car_in.category,
        features=features_str,
        image_url=car_in.image_url
    )
    
    db.add(car)
    db.commit()
    db.refresh(car)
    return car


@router.get("/{car_id}", response_model=CarSchema)
def read_car(
    *,
    db: Session = Depends(get_db),
    car_id: int
) -> Any:
    """
    Get car by ID.
    """
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    return car


@router.put("/{car_id}", response_model=CarSchema)
def update_car(
    *,
    db: Session = Depends(get_db),
    car_id: int,
    car_in: CarUpdate
) -> Any:
    """
    Update car.
    """
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    update_data = car_in.dict(exclude_unset=True)
    
    # Convert features dict to JSON string if present
    if "features" in update_data and update_data["features"]:
        update_data["features"] = json.dumps(update_data["features"])
    
    for field, value in update_data.items():
        setattr(car, field, value)
    
    db.add(car)
    db.commit()
    db.refresh(car)
    return car


@router.delete("/{car_id}", response_model=CarSchema)
def delete_car(
    *,
    db: Session = Depends(get_db),
    car_id: int
) -> Any:
    """
    Delete car.
    """
    car = db.query(Car).filter(Car.id == car_id).first()
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    db.delete(car)
    db.commit()
    return car 