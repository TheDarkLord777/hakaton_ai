import json
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.models import Client, Car, Visit
from app.db.base import engine, Base, SessionLocal


# Sample data
def add_lastname_to_clients(db: Session):
    """Add last_name column to clients table if it doesn't exist"""
    try:
        # Check if column exists
        db.execute(text("SELECT last_name FROM clients LIMIT 1"))
        print("last_name column already exists")
    except:
        # Add column
        db.execute(text("ALTER TABLE clients ADD COLUMN last_name VARCHAR"))
        db.commit()
        print("Added last_name column to clients table")

def add_columns_to_clients(db: Session):
    """Add new columns to clients table if they don't exist"""
    try:
        # Check if columns exist
        db.execute(text("SELECT has_credit, workplace FROM clients LIMIT 1"))
        print("has_credit and workplace columns already exist")
    except:
        try:
            # Add columns
            db.execute(text("ALTER TABLE clients ADD COLUMN has_credit VARCHAR"))
            db.execute(text("ALTER TABLE clients ADD COLUMN workplace VARCHAR"))
            db.commit()
            print("Added has_credit and workplace columns to clients table")
        except Exception as e:
            print(f"Error adding columns: {e}")

def create_sample_data():
    """
    Initialize the database with sample data.
    """
    db = SessionLocal()
    
    try:
        # Add new column
        add_lastname_to_clients(db)
        
        # Add new columns
        add_columns_to_clients(db)
        
        # Check if we have sample data
        client_count = db.query(Client).count()
        if client_count == 0:
            # Create sample clients with last names
            clients = [
                Client(
                    first_name="John",
                    last_name="Smith",
                    gender="Male",
                    age=35,
                    phone="123-456-7890",
                    interests="Luxury sedans, German brands",
                    budget=50000.0
                ),
                Client(
                    first_name="Emma",
                    last_name="Johnson",
                    gender="Female",
                    age=28,
                    phone="234-567-8901",
                    interests="Compact SUVs, Japanese brands, Fuel efficiency",
                    budget=35000.0
                ),
                Client(
                    first_name="Michael",
                    last_name="Brown",
                    gender="Male",
                    age=42,
                    phone="345-678-9012",
                    interests="Sports cars, American brands, High performance",
                    budget=75000.0
                ),
                Client(
                    first_name="Sophia",
                    last_name="Garcia",
                    gender="Female",
                    age=31,
                    phone="456-789-0123",
                    interests="Electric vehicles, Environmentally friendly",
                    budget=45000.0
                )
            ]
            db.add_all(clients)
            db.commit()
            
            # Create sample cars
            sample_cars = [
                {
                    "name": "ModelX",
                    "brand": "Tesla",
                    "model": "X",
                    "price": 80000,
                    "year": 2023,
                    "category": "SUV",
                    "features": json.dumps({
                        "luxury": True,
                        "electric": True,
                        "sporty": True,
                        "family_friendly": True,
                        "powerful": True,
                        "prestige": True,
                        "safety": True,
                        "spacious": True
                    }),
                    "image_url": "https://example.com/images/tesla_model_x.jpg"
                },
                {
                    "name": "Camry",
                    "brand": "Toyota",
                    "model": "Camry",
                    "price": 35000,
                    "year": 2023,
                    "category": "Sedan",
                    "features": json.dumps({
                        "fuel_efficient": True,
                        "comfort": True,
                        "family_friendly": True,
                        "safety": True,
                        "affordable": True
                    }),
                    "image_url": "https://example.com/images/toyota_camry.jpg"
                },
                {
                    "name": "Civic",
                    "brand": "Honda",
                    "model": "Civic",
                    "price": 25000,
                    "year": 2023,
                    "category": "Sedan",
                    "features": json.dumps({
                        "fuel_efficient": True,
                        "entry_level": True,
                        "affordable": True,
                        "safety": True
                    }),
                    "image_url": "https://example.com/images/honda_civic.jpg"
                },
                {
                    "name": "Mustang",
                    "brand": "Ford",
                    "model": "Mustang",
                    "price": 45000,
                    "year": 2023,
                    "category": "Coupe",
                    "features": json.dumps({
                        "sporty": True,
                        "powerful": True,
                        "prestige": True
                    }),
                    "image_url": "https://example.com/images/ford_mustang.jpg"
                },
                {
                    "name": "X5",
                    "brand": "BMW",
                    "model": "X5",
                    "price": 75000,
                    "year": 2023,
                    "category": "SUV",
                    "features": json.dumps({
                        "luxury": True,
                        "comfort": True,
                        "prestige": True,
                        "safety": True,
                        "spacious": True,
                        "powerful": True
                    }),
                    "image_url": "https://example.com/images/bmw_x5.jpg"
                },
                {
                    "name": "Outback",
                    "brand": "Subaru",
                    "model": "Outback",
                    "price": 32000,
                    "year": 2023,
                    "category": "Wagon",
                    "features": json.dumps({
                        "family_friendly": True,
                        "safety": True,
                        "spacious": True,
                        "affordable": True
                    }),
                    "image_url": "https://example.com/images/subaru_outback.jpg"
                },
                {
                    "name": "Fiat 500",
                    "brand": "Fiat",
                    "model": "500",
                    "price": 20000,
                    "year": 2023,
                    "category": "Hatchback",
                    "features": json.dumps({
                        "fuel_efficient": True,
                        "entry_level": True,
                        "affordable": True
                    }),
                    "image_url": "https://example.com/images/fiat_500.jpg"
                },
                {
                    "name": "S-Class",
                    "brand": "Mercedes",
                    "model": "S-Class",
                    "price": 110000,
                    "year": 2023,
                    "category": "Luxury",
                    "features": json.dumps({
                        "luxury": True,
                        "comfort": True,
                        "prestige": True,
                        "safety": True,
                        "powerful": True,
                        "upgrade": True
                    }),
                    "image_url": "https://example.com/images/mercedes_s_class.jpg"
                },
                {
                    "name": "Odyssey",
                    "brand": "Honda",
                    "model": "Odyssey",
                    "price": 38000,
                    "year": 2023,
                    "category": "Minivan",
                    "features": json.dumps({
                        "family_friendly": True,
                        "spacious": True,
                        "safety": True
                    }),
                    "image_url": "https://example.com/images/honda_odyssey.jpg"
                },
                {
                    "name": "Model 3",
                    "brand": "Tesla",
                    "model": "3",
                    "price": 50000,
                    "year": 2023,
                    "category": "Sedan",
                    "features": json.dumps({
                        "electric": True,
                        "sporty": True,
                        "prestige": True,
                        "safety": True,
                        "technology": True
                    }),
                    "image_url": "https://example.com/images/tesla_model_3.jpg"
                }
            ]
            
            # Add sample cars to database
            for car_data in sample_cars:
                car = Car(**car_data)
                db.add(car)
            
            db.commit()
            
            # Create sample visits and recommendations
            for client in clients:
                # Random number of visits (0-3)
                visit_count = random.randint(0, 3)
                
                for i in range(visit_count):
                    # Random date within the last 30 days
                    days_ago = random.randint(0, 30)
                    entry_time = datetime.utcnow() - timedelta(days=days_ago, hours=random.randint(0, 12))
                    
                    # 80% chance of having an exit time
                    exit_time = None
                    if random.random() < 0.8:
                        hours_spent = random.uniform(0.5, 3)
                        exit_time = entry_time + timedelta(hours=hours_spent)
                    
                    # Random purpose
                    purposes = ["Test drive", "Information", "Purchase", "Maintenance", "Just looking"]
                    purpose = random.choice(purposes)
                    
                    # Create visit
                    visit = Visit(
                        client_id=client.id,
                        entry_time=entry_time,
                        exit_time=exit_time,
                        purpose=purpose
                    )
                    
                    db.add(visit)
            
            db.commit()
            
            print("Sample data created successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create sample data
    create_sample_data() 