from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.db.base import engine, Base
# from app.db.init_db import create_sample_data  # Import sample data function - vaqtincha o'chirib qo'yamiz

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize database with sample data
# create_sample_data()  # Bu qatorni vaqtincha kommentariyaga olib qo'yamiz

app = FastAPI(
    title="AutoClientAI",
    description="Smart Reception & Recommendation System for Car Showrooms",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for face images
app.mount("/faces", StaticFiles(directory="public/faces"), name="faces")

# Include API router
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to AutoClientAI API. Visit /docs for documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
