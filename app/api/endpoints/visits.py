from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
import datetime
import json

from app.db.base import get_db
from app.models.models import Visit, Client
from app.schemas.visit import VisitCreate, VisitUpdate, Visit as VisitSchema, VisitWithClient

router = APIRouter()


@router.get("/", response_model=List[VisitSchema])
def read_visits(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
) -> Any:
    """
    Retrieve visits.
    """
    visits = db.query(Visit).offset(skip).limit(limit).all()
    return visits


@router.get("/current", response_model=List[VisitWithClient])
def read_current_visits(db: Session = Depends(get_db)) -> Any:
    """
    Retrieve all current visits (no exit time).
    """
    visits = db.query(Visit).filter(Visit.exit_time.is_(None)).all()
    
    # JSON stringlarni deserialize qilish kerak emas, schema Any turga o'zgartirildi
    return visits


@router.post("/", response_model=VisitSchema)
def create_visit(
    *,
    db: Session = Depends(get_db),
    visit_in: VisitCreate
) -> Any:
    """
    Create new visit.
    """
    client = db.query(Client).filter(Client.id == visit_in.client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Convert recommendations dict to JSON string if present
    recommendations_str = None
    if visit_in.recommendations:
        recommendations_str = json.dumps(visit_in.recommendations)
    
    visit = Visit(
        client_id=visit_in.client_id,
        entry_time=visit_in.entry_time,
        exit_time=visit_in.exit_time,
        purpose=visit_in.purpose,
        recommendations=recommendations_str
    )
    
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/{visit_id}", response_model=VisitSchema)
def read_visit(
    *,
    db: Session = Depends(get_db),
    visit_id: int
) -> Any:
    """
    Get visit by ID.
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )
    return visit


@router.put("/{visit_id}", response_model=VisitSchema)
def update_visit(
    *,
    db: Session = Depends(get_db),
    visit_id: int,
    visit_in: VisitUpdate
) -> Any:
    """
    Update visit.
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )
    
    update_data = visit_in.dict(exclude_unset=True)
    
    # Convert recommendations dict to JSON string if present
    if "recommendations" in update_data and update_data["recommendations"]:
        update_data["recommendations"] = json.dumps(update_data["recommendations"])
    
    for field, value in update_data.items():
        setattr(visit, field, value)
    
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.put("/{visit_id}/checkout", response_model=VisitSchema)
def checkout_visit(
    *,
    db: Session = Depends(get_db),
    visit_id: int
) -> Any:
    """
    Checkout a visit (set exit time to now).
    """
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found"
        )
    
    visit.exit_time = datetime.datetime.utcnow()
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/client/{client_id}", response_model=List[VisitSchema])
def read_client_visits(
    *,
    db: Session = Depends(get_db),
    client_id: int
) -> Any:
    """
    Get all visits for a specific client.
    """
    visits = db.query(Visit).filter(Visit.client_id == client_id).all()
    return visits 