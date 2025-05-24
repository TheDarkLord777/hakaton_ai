from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text, JSON, ARRAY
from sqlalchemy.orm import relationship
import datetime

from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    gender = Column(String)
    age = Column(Integer)
    phone = Column(String, nullable=True)
    interests = Column(String, nullable=True)
    budget = Column(Float, nullable=True)
    has_credit = Column(String, nullable=True)  # Kredit bor/yo'qligi
    workplace = Column(String, nullable=True)   # Ish joyi
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    face_encodings = relationship("FaceEncoding", back_populates="client", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="client", cascade="all, delete-orphan")


class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    encoding_vector = Column(Text)  # Store as serialized numpy array (JSON string)
    image_path = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="face_encodings")


class Visit(Base):
    __tablename__ = "visits"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    entry_time = Column(DateTime, default=datetime.datetime.utcnow)
    exit_time = Column(DateTime, nullable=True)
    purpose = Column(String, nullable=True)
    recommendations = Column(Text, nullable=True)  # Store as JSON string
    
    # Relationships
    client = relationship("Client", back_populates="visits")


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, index=True)
    model = Column(String)
    price = Column(Float)
    year = Column(Integer)
    category = Column(String)  # sedan, SUV, hatchback, etc.
    features = Column(Text)  # JSON string of features
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow) 