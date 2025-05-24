import face_recognition
import numpy as np
import os
import json
import cv2
from typing import List, Tuple, Dict, Optional, Any
from sqlalchemy.orm import Session

from app.models.models import Client, FaceEncoding


class FaceRecognitionService:
    def __init__(self, tolerance: float = 0.6):
        self.tolerance = tolerance  # Lower is more strict
    
    def encode_face_from_image(self, image_path: str) -> List[float]:
        """
        Encode a face from an image file.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            List of encoding values or None if no face found
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
            
        image = face_recognition.load_image_file(image_path)
        face_locations = face_recognition.face_locations(image)
        
        if not face_locations:
            raise ValueError("No faces found in the image")
            
        # Get the first face found
        face_encoding = face_recognition.face_encodings(image, face_locations)[0]
        return face_encoding.tolist()
    
    def encode_face_from_frame(self, frame: np.ndarray) -> Tuple[List[float], List[int]]:
        """
        Encode a face from a video frame.
        
        Args:
            frame: OpenCV frame (numpy array)
            
        Returns:
            Tuple of (encoding list, face location [top, right, bottom, left])
        """
        # Convert BGR to RGB (OpenCV uses BGR, face_recognition uses RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Find faces
        face_locations = face_recognition.face_locations(rgb_frame)
        
        if not face_locations:
            raise ValueError("No faces found in the frame")
            
        # Get the first face found
        face_encoding = face_recognition.face_encodings(rgb_frame, face_locations)[0]
        return face_encoding.tolist(), face_locations[0]
    
    def find_matching_client(
        self, 
        face_encoding: List[float], 
        db: Session
    ) -> Tuple[Optional[Client], Optional[float]]:
        """
        Find a client with a matching face encoding.
        
        Args:
            face_encoding: Face encoding to match
            db: Database session
            
        Returns:
            Tuple of (client if found or None, confidence score or None)
        """
        face_encoding_np = np.array(face_encoding)
        
        # Get all face encodings from the database
        db_face_encodings = db.query(FaceEncoding).all()
        
        best_match = None
        best_match_score = 1.0  # Lower is better (0 is perfect match)
        
        for db_face in db_face_encodings:
            # Convert stored JSON string to numpy array
            stored_encoding = np.array(json.loads(db_face.encoding_vector))
            
            # Calculate face distance (lower means more similar)
            face_distance = face_recognition.face_distance([stored_encoding], face_encoding_np)[0]
            
            if face_distance < self.tolerance and face_distance < best_match_score:
                best_match_score = face_distance
                best_match = db_face.client
        
        if best_match:
            # Convert distance to confidence (0-100%)
            confidence = (1 - best_match_score) * 100
            return best_match, confidence
        
        return None, None
    
    def save_face_encoding(
        self, 
        client_id: int, 
        face_encoding: List[float], 
        image_path: str,
        db: Session
    ) -> FaceEncoding:
        """
        Save a face encoding for a client.
        
        Args:
            client_id: ID of the client
            face_encoding: Face encoding to save
            image_path: Path to the image file
            db: Database session
            
        Returns:
            Created FaceEncoding object
        """
        # Convert numpy array to list and then to JSON string
        encoding_json = json.dumps(face_encoding)
        
        face_encoding_obj = FaceEncoding(
            client_id=client_id,
            encoding_vector=encoding_json,
            image_path=image_path
        )
        
        db.add(face_encoding_obj)
        db.commit()
        db.refresh(face_encoding_obj)
        
        return face_encoding_obj

    def detect_faces(self, image):
        """
        Detect all faces in an image
        """
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Find all face locations
        face_locations = face_recognition.face_locations(rgb_image, model="hog")
        
        return face_locations

    def encode_face_from_location(self, image, face_location):
        """
        Encode a face from an image and specific face location
        """
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Encode the face
        face_encodings = face_recognition.face_encodings(rgb_image, [face_location])
        
        if len(face_encodings) == 0:
            raise ValueError("No face found at the specified location")
        
        return face_encodings[0] 