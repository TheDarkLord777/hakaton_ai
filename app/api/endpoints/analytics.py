from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json

from app.db.base import get_db
from app.models.models import Visit, Client, Car

router = APIRouter()


@router.get("/visits/count")
def get_visit_count(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get the total number of visits in the specified time period.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    count = db.query(func.count(Visit.id)).filter(
        Visit.entry_time >= start_date
    ).scalar()
    
    return {"count": count, "days": days}


@router.get("/visits/by-gender")
def get_visits_by_gender(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get visits grouped by gender.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = db.query(
        Client.gender,
        func.count(Visit.id).label("visit_count")
    ).join(
        Visit, Visit.client_id == Client.id
    ).filter(
        Visit.entry_time >= start_date
    ).group_by(
        Client.gender
    ).all()
    
    # Convert to dictionary format
    gender_data = [{"gender": gender, "count": count} for gender, count in result]
    
    return {"data": gender_data, "days": days}


@router.get("/visits/by-age")
def get_visits_by_age(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get visits grouped by age ranges.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Define age ranges
    age_ranges = [
        {"min": 0, "max": 18, "label": "0-18"},
        {"min": 19, "max": 25, "label": "19-25"},
        {"min": 26, "max": 35, "label": "26-35"},
        {"min": 36, "max": 45, "label": "36-45"},
        {"min": 46, "max": 55, "label": "46-55"},
        {"min": 56, "max": 100, "label": "56+"}
    ]
    
    # Get all clients with visits in the specified time period
    clients_with_visits = db.query(
        Client, func.count(Visit.id).label("visit_count")
    ).join(
        Visit, Visit.client_id == Client.id
    ).filter(
        Visit.entry_time >= start_date
    ).group_by(
        Client.id
    ).all()
    
    # Initialize results
    results = {age_range["label"]: 0 for age_range in age_ranges}
    
    # Group clients by age range
    for client, visit_count in clients_with_visits:
        for age_range in age_ranges:
            if age_range["min"] <= client.age <= age_range["max"]:
                results[age_range["label"]] += visit_count
                break
    
    # Convert to list format
    age_data = [{"age_range": label, "count": count} for label, count in results.items()]
    
    return {"data": age_data, "days": days}


@router.get("/cars/most-recommended")
def get_most_recommended_cars(
    days: int = 30,
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """
    Get the most frequently recommended cars.
    """
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get visits with recommendations
    visits = db.query(Visit).filter(
        Visit.entry_time >= start_date,
        Visit.recommendations.isnot(None)
    ).all()
    
    # Count car recommendations
    car_counts = {}
    
    for visit in visits:
        try:
            recommendations = json.loads(visit.recommendations)
            for rec in recommendations:
                car_id = rec.get("car_id")
                if car_id:
                    if car_id not in car_counts:
                        car_counts[car_id] = 0
                    car_counts[car_id] += 1
        except (json.JSONDecodeError, AttributeError):
            continue
    
    # Sort by count
    sorted_cars = sorted(car_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    # Get car details
    result = []
    for car_id, count in sorted_cars:
        car = db.query(Car).filter(Car.id == car_id).first()
        if car:
            result.append({
                "id": car.id,
                "name": f"{car.brand} {car.model}",
                "count": count
            })
    
    return {"data": result, "days": days}


@router.get("/clients/stats")
def get_client_stats(db: Session = Depends(get_db)):
    """
    Get general client statistics.
    """
    total_clients = db.query(func.count(Client.id)).scalar()
    
    # Gender distribution
    gender_distribution = db.query(
        Client.gender,
        func.count(Client.id).label("count")
    ).group_by(
        Client.gender
    ).all()
    
    gender_data = [{"gender": gender, "count": count} for gender, count in gender_distribution]
    
    # Car ownership
    has_car_count = db.query(func.count(Client.id)).filter(Client.has_car == True).scalar()
    
    # Credit history
    has_credit_count = db.query(func.count(Client.id)).filter(Client.has_credit == True).scalar()
    
    # Age distribution (same ranges as visits by age)
    age_ranges = [
        {"min": 0, "max": 18, "label": "0-18"},
        {"min": 19, "max": 25, "label": "19-25"},
        {"min": 26, "max": 35, "label": "26-35"},
        {"min": 36, "max": 45, "label": "36-45"},
        {"min": 46, "max": 55, "label": "46-55"},
        {"min": 56, "max": 100, "label": "56+"}
    ]
    
    age_distribution = {}
    for age_range in age_ranges:
        count = db.query(func.count(Client.id)).filter(
            Client.age >= age_range["min"],
            Client.age <= age_range["max"]
        ).scalar()
        age_distribution[age_range["label"]] = count
    
    age_data = [{"age_range": label, "count": count} for label, count in age_distribution.items()]
    
    return {
        "total_clients": total_clients,
        "gender_distribution": gender_data,
        "has_car_percentage": (has_car_count / total_clients * 100) if total_clients > 0 else 0,
        "has_credit_percentage": (has_credit_count / total_clients * 100) if total_clients > 0 else 0,
        "age_distribution": age_data
    } 