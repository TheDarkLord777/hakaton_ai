from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
import uuid
import cv2
import numpy as np
from datetime import datetime
import json
from typing import List, Dict, Any
import face_recognition

from app.db.base import get_db
from app.models.models import Client, FaceEncoding, Visit
from app.schemas.face import FaceDetectionResult
from app.services.face_recognition.recognition import FaceRecognitionService
from app.services.recommendation.engine import RecommendationEngine

router = APIRouter()
face_service = FaceRecognitionService()
recommendation_engine = RecommendationEngine()

# Directory to save face images
FACE_UPLOAD_DIR = "public/faces"
os.makedirs(FACE_UPLOAD_DIR, exist_ok=True)


@router.post("/detect", response_model=FaceDetectionResult)
async def detect_face(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Detect face in an uploaded image and look for matches in the database.
    If found, log a visit automatically.
    """
    try:
        # Read image from request
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image"
            )
        
        # Extract face encoding
        try:
            face_encoding, face_location = face_service.encode_face_from_frame(image)
        except ValueError:
            return FaceDetectionResult(
                is_recognized=False,
                client_id=None,
                confidence=None,
                face_location=None
            )
        
        # Find matching client
        client, confidence = face_service.find_matching_client(face_encoding, db)
        
        if client:
            # Log a visit in the background
            background_tasks.add_task(
                log_visit,
                client_id=client.id,
                db=db
            )
            
            return FaceDetectionResult(
                is_recognized=True,
                client_id=client.id,
                client_name=f"{client.first_name} {client.last_name}",
                confidence=confidence,
                face_location=list(face_location)
            )
        else:
            return FaceDetectionResult(
                is_recognized=False,
                client_id=None,
                client_name=None,
                confidence=None,
                face_location=list(face_location)
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )


@router.post("/register-face")
async def register_face(
    client_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Register a face for an existing client.
    """
    # Check if client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    try:
        # Save the uploaded image
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(FACE_UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        # Extract face encoding
        try:
            face_encoding = face_service.encode_face_from_image(file_path)
        except ValueError:
            # Clean up file if no face found
            os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face found in the uploaded image"
            )
        
        # Save face encoding to database
        face_encoding_obj = face_service.save_face_encoding(
            client_id=client_id,
            face_encoding=face_encoding,
            image_path=file_path,
            db=db
        )
        
        return {"success": True, "message": "Face registered successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering face: {str(e)}"
        )


@router.post("/recommendations/{client_id}")
def get_recommendations(
    client_id: int,
    db: Session = Depends(get_db)
):
    """
    Get car recommendations for a client.
    """
    # Check if client exists
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    # Get recommendations
    recommendations = recommendation_engine.get_recommendations(client, db)
    
    # Format recommendations
    result = []
    for car, score in recommendations:
        car_dict = {
            "id": car.id,
            "name": car.name,
            "brand": car.brand,
            "model": car.model,
            "price": car.price,
            "year": car.year,
            "category": car.category,
            "image_url": car.image_url,
            "interest_score": score
        }
        result.append(car_dict)
    
    return result


def log_visit(client_id: int, db: Session):
    """
    Log a visit for a client (used as a background task).
    """
    visit = Visit(
        client_id=client_id,
        entry_time=datetime.utcnow(),
        purpose="Auto detected by face recognition"
    )
    
    db.add(visit)
    db.commit()
    
    # Get recommendations and save them to the visit
    client = db.query(Client).filter(Client.id == client_id).first()
    if client:
        recommendations = recommendation_engine.get_recommendations(client, db)
        recommendations_data = []
        
        for car, score in recommendations:
            recommendations_data.append({
                "car_id": car.id,
                "name": f"{car.brand} {car.model}",
                "interest_score": score
            })
        
        visit.recommendations = json.dumps(recommendations_data)
        db.add(visit)
        db.commit()


@router.post("/detect-multiple")
async def detect_multiple_faces(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Detect multiple faces in an uploaded image and look for matches in the database.
    """
    try:
        # Read image from request
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image"
            )
        
        # Extract all face encodings
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_image)
        results = []
        
        for face_location in face_locations:
            try:
                # Get face encoding
                face_encodings = face_recognition.face_encodings(rgb_image, [face_location])
                if len(face_encodings) == 0:
                    continue
                    
                face_encoding = face_encodings[0]
                
                # Find matching client
                client, confidence = face_service.find_matching_client(face_encoding, db)
                
                if client:
                    # Log a visit in the background
                    background_tasks.add_task(
                        log_visit,
                        client_id=client.id,
                        db=db
                    )
                    
                    results.append({
                        "is_recognized": True,
                        "client_id": client.id,
                        "confidence": confidence,
                        "face_location": list(face_location)
                    })
                else:
                    results.append({
                        "is_recognized": False,
                        "client_id": None,
                        "confidence": None,
                        "face_location": list(face_location)
                    })
            except Exception as e:
                # Skip faces that can't be encoded
                continue
        
        return {"faces": results}
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        ) 