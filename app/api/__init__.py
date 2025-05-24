from fastapi import APIRouter
from app.api.endpoints import clients, visits, cars, face_recognition, analytics

api_router = APIRouter()
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(visits.router, prefix="/visits", tags=["visits"])
api_router.include_router(cars.router, prefix="/cars", tags=["cars"])
api_router.include_router(face_recognition.router, prefix="/face", tags=["face_recognition"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"]) 