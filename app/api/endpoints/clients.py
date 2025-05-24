from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List, Optional

from app.db.base import get_db
from app.models.models import Client
from app.schemas.client import ClientCreate, ClientUpdate, Client as ClientSchema

router = APIRouter()


@router.get("/", response_model=List[ClientSchema])
def read_clients(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
) -> Any:
    """
    Retrieve clients.
    """
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients


@router.post("/", response_model=ClientSchema)
def create_client(client: ClientCreate, db: Session = Depends(get_db)):
    """
    Create a new client.
    """
    # Telefon raqami bo'yicha tekshirish (agar telefon raqami berilgan bo'lsa)
    if client.phone:
        existing_client = db.query(Client).filter(Client.phone == client.phone).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
    
    # Jinsni avtomatik aniqlash (agar berilmagan bo'lsa)
    if not client.gender and client.last_name:
        if client.last_name.strip().lower().endswith('a'):
            client.gender = "Female"
        else:
            client.gender = "Male"
            
    # Bo'sh qatorni None ga o'zgartirish
    has_credit = client.has_credit if client.has_credit and client.has_credit.strip() else None
            
    db_client = Client(
        first_name=client.first_name,
        last_name=client.last_name,
        gender=client.gender,
        age=client.age,
        phone=client.phone,
        interests=client.interests,
        budget=client.budget,
        has_credit=has_credit,
        workplace=client.workplace
    )
    
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client


@router.get("/{client_id}", response_model=ClientSchema)
def read_client(
    *,
    db: Session = Depends(get_db),
    client_id: int
) -> Any:
    """
    Get client by ID.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    return client


@router.put("/{client_id}", response_model=ClientSchema)
def update_client(
    *,
    db: Session = Depends(get_db),
    client_id: int,
    client_in: ClientUpdate
) -> Any:
    """
    Update client.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Telefon raqami o'zgartirilgan bo'lsa, unikal tekshirish
    if client_in.phone and client_in.phone != client.phone:
        existing_client = db.query(Client).filter(Client.phone == client_in.phone).first()
        if existing_client:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
    
    update_data = client_in.dict(exclude_unset=True)
    
    # Bo'sh qatorni None ga o'zgartirish
    if "has_credit" in update_data and update_data["has_credit"] and not update_data["has_credit"].strip():
        update_data["has_credit"] = None
    
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", response_model=ClientSchema)
def delete_client(
    *,
    db: Session = Depends(get_db),
    client_id: int
) -> Any:
    """
    Delete client.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    db.delete(client)
    db.commit()
    return client 