from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class FaceEncodingBase(BaseModel):
    encoding_vector: str  # JSON serialized string
    image_path: str


class FaceEncodingCreate(FaceEncodingBase):
    client_id: int


class FaceEncodingInDB(FaceEncodingBase):
    id: int
    client_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class FaceEncoding(FaceEncodingInDB):
    pass


class FaceDetectionResult(BaseModel):
    is_recognized: bool
    client_id: Optional[int] = None
    confidence: Optional[float] = None
    face_location: Optional[List[int]] = None  # [top, right, bottom, left] 