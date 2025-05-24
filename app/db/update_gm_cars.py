# app/db/update_gm_cars.py
import json
from sqlalchemy.orm import Session

from app.models.models import Car
from app.db.base import SessionLocal, engine, Base

def update_gm_cars():
    """
    Ma'lumotlar bazasidagi barcha avtomobillarni o'chirib,
    GM Uzbekistan avtomobillarini qo'shish
    """
    db = SessionLocal()
    
    try:
        # Barcha avtomobillarni o'chirish
        car_count = db.query(Car).count()
        if car_count > 0:
            print(f"Bazada {car_count} ta avtomobil mavjud, ularni o'chirilmoqda...")
            db.query(Car).delete()
            db.commit()
            print("Barcha avtomobillar muvaffaqiyatli o'chirildi")
        
        # GM avtomobillarini qo'shish
        gm_cars = [
            {
                "name": "Onix",
                "brand": "Chevrolet",
                "model": "Onix",
                "price": 161900000,
                "year": 2023,
                "category": "Sedan",
                "features": json.dumps({
                    "engine": "1.0L Turbo",
                    "transmission": "Automatic",
                    "fuel_type": "Petrol",
                    "seats": 5,
                    "safety": True,
                    "technology": True,
                    "fuel_efficient": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/onix.jpg"
            },
            {
                "name": "Tracker",
                "brand": "Chevrolet",
                "model": "Tracker",
                "price": 215951360,
                "year": 2023,
                "category": "SUV",
                "features": json.dumps({
                    "engine": "1.0L Turbo",
                    "transmission": "Automatic",
                    "fuel_type": "Petrol",
                    "seats": 5,
                    "safety": True,
                    "technology": True,
                    "sporty": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/tracker.jpg"
            },
            {
                "name": "Captiva",
                "brand": "Chevrolet",
                "model": "Captiva",
                "price": 284900000,
                "year": 2023,
                "category": "SUV",
                "features": json.dumps({
                    "engine": "1.5L Turbo",
                    "transmission": "CVT",
                    "fuel_type": "Petrol",
                    "seats": 7,
                    "safety": True,
                    "family_friendly": True,
                    "spacious": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/captiva.jpg"
            },
            {
                "name": "Equinox",
                "brand": "Chevrolet",
                "model": "Equinox",
                "price": 383450560,
                "year": 2023,
                "category": "SUV",
                "features": json.dumps({
                    "engine": "1.5L Turbo",
                    "transmission": "Automatic",
                    "fuel_type": "Petrol",
                    "seats": 5,
                    "safety": True,
                    "technology": True,
                    "comfort": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/equinox.jpg"
            },
            {
                "name": "Traverse",
                "brand": "Chevrolet",
                "model": "Traverse",
                "price": 657730560,
                "year": 2023,
                "category": "SUV",
                "features": json.dumps({
                    "engine": "3.6L V6",
                    "transmission": "Automatic",
                    "fuel_type": "Petrol",
                    "seats": 7,
                    "luxury": True,
                    "spacious": True,
                    "powerful": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/traverse.jpg"
            },
            {
                "name": "Tahoe",
                "brand": "Chevrolet",
                "model": "Tahoe",
                "price": 1109274880,
                "year": 2023,
                "category": "SUV",
                "features": json.dumps({
                    "engine": "5.3L V8",
                    "transmission": "Automatic",
                    "fuel_type": "Petrol",
                    "seats": 7,
                    "luxury": True,
                    "powerful": True,
                    "prestige": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/tahoe.jpg"
            },
            {
                "name": "Malibu XL",
                "brand": "Chevrolet",
                "model": "Malibu XL",
                "price": 375000640,
                "year": 2023,
                "category": "Sedan",
                "features": json.dumps({
                    "engine": "2.0L Turbo",
                    "transmission": "Automatic",
                    "fuel_type": "Petrol",
                    "seats": 5,
                    "luxury": True,
                    "comfort": True,
                    "prestige": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/malibu.jpg"
            },
            {
                "name": "Cobalt",
                "brand": "Chevrolet",
                "model": "Cobalt",
                "price": 146455000,
                "year": 2023,
                "category": "Sedan",
                "features": json.dumps({
                    "engine": "1.5L",
                    "transmission": "Manual/Automatic",
                    "fuel_type": "Petrol",
                    "seats": 5,
                    "affordable": True,
                    "fuel_efficient": True,
                    "family_friendly": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/cobalt.jpg"
            },
            {
                "name": "Lacetti",
                "brand": "Chevrolet",
                "model": "Lacetti",
                "price": 168342000,
                "year": 2023,
                "category": "Sedan",
                "features": json.dumps({
                    "engine": "1.5L",
                    "transmission": "Manual/Automatic",
                    "fuel_type": "Petrol",
                    "seats": 5,
                    "affordable": True,
                    "spacious": True,
                    "family_friendly": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/lacetti.jpg"
            },
            {
                "name": "Damas",
                "brand": "Chevrolet",
                "model": "Damas",
                "price": 93156000,
                "year": 2023,
                "category": "LCV",
                "features": json.dumps({
                    "engine": "0.8L",
                    "transmission": "Manual",
                    "fuel_type": "Petrol",
                    "seats": 7,
                    "affordable": True,
                    "compact": True,
                    "utility": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/damas.jpg"
            },
            {
                "name": "Labo",
                "brand": "Chevrolet",
                "model": "Labo",
                "price": 93771000,
                "year": 2023,
                "category": "LCV",
                "features": json.dumps({
                    "engine": "0.8L",
                    "transmission": "Manual",
                    "fuel_type": "Petrol",
                    "seats": 2,
                    "affordable": True,
                    "utility": True,
                    "commercial": True
                }),
                "image_url": "https://chevrolet.uz/uploads/cars/labo.jpg"
            }
        ]
        
        # Har bir GM avtomobilini qo'shish
        for car_data in gm_cars:
            car = Car(**car_data)
            db.add(car)
            print(f"Yangi avtomobil qo'shilmoqda: {car_data['name']}")
        
        db.commit()
        print(f"Jami {len(gm_cars)} ta GM avtomobillari muvaffaqiyatli qo'shildi")
        
    except Exception as e:
        db.rollback()
        print(f"Xatolik yuz berdi: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    # Jadvallar mavjud ekanligiga ishonch hosil qilish
    Base.metadata.create_all(bind=engine)
    
    # GM avtomobillarini qo'shish
    update_gm_cars()