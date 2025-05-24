from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
import json

from app.models.models import Client, Car


class RecommendationEngine:
    def __init__(self):
        pass
    
    def get_recommendations(
        self, 
        client: Client, 
        db: Session,
        limit: int = 3
    ) -> List[Tuple[Car, float]]:
        """
        Get car recommendations for a client based on their profile.
        Rule-based recommendation system.
        
        Args:
            client: Client object
            db: Database session
            limit: Number of recommendations to return
            
        Returns:
            List of tuples (Car, interest_score)
        """
        # Get all available cars
        all_cars = db.query(Car).all()
        
        # Calculate interest score for each car
        scored_cars = []
        for car in all_cars:
            interest_score = self._calculate_interest_score(client, car)
            scored_cars.append((car, interest_score))
        
        # Sort by interest score (highest first)
        scored_cars.sort(key=lambda x: x[1], reverse=True)
        
        # Return top N recommendations
        return scored_cars[:limit]
    
    def _calculate_interest_score(self, client: Client, car: Car) -> float:
        """
        Calculate interest score for a car based on client's profile.
        
        Args:
            client: Client object
            car: Car object
            
        Returns:
            Interest score (0-100)
        """
        features = json.loads(car.features) if car.features else {}
        
        score = 50.0  # Base score
        
        # Age-based rules
        if client.age < 25:
            # Young clients tend to prefer sporty or smaller cars
            if features.get("sporty", False):
                score += 15
            if car.category.lower() in ["hatchback", "coupe", "convertible"]:
                score += 10
            if car.price > 30000:
                score -= 10  # Young clients may have budget constraints
        
        elif 25 <= client.age < 40:
            # Middle-aged clients may prefer practical or family cars
            if features.get("family_friendly", False):
                score += 10
            if car.category.lower() in ["sedan", "suv", "crossover"]:
                score += 10
            
        else:  # age >= 40
            # Older clients may prefer comfort and luxury
            if features.get("luxury", False):
                score += 15
            if features.get("comfort", False):
                score += 10
            if car.category.lower() in ["sedan", "suv", "luxury"]:
                score += 10
        
        # Gender-based rules (very basic, consider removing or improving)
        if client.gender.lower() == "male":
            if features.get("powerful", False):
                score += 5
        elif client.gender.lower() == "female":
            if features.get("fuel_efficient", False):
                score += 5
        
        # Family size rules
        if client.family_members > 2:
            if features.get("family_friendly", False):
                score += 15
            if car.category.lower() in ["suv", "minivan", "wagon"]:
                score += 15
            if features.get("spacious", False):
                score += 10
        
        # Job-based rules
        if "executive" in client.job_title.lower() or "manager" in client.job_title.lower():
            if features.get("luxury", False):
                score += 10
            if features.get("prestige", False):
                score += 10
        
        # Marital status rules
        if client.marital_status.lower() == "married":
            if features.get("family_friendly", False):
                score += 10
            if features.get("safety", False):
                score += 10
        
        # Student status
        if client.is_student:
            if features.get("fuel_efficient", False):
                score += 15
            if features.get("affordable", False):
                score += 15
            if car.price > 20000:
                score -= 15
        
        # Car ownership history
        if client.has_car:
            if features.get("upgrade", False):
                score += 10
        else:
            if features.get("entry_level", False):
                score += 10
        
        # Credit history
        if not client.has_credit and car.price > 30000:
            score -= 10  # Reduce score for expensive cars if no credit history
        
        # Clamp the score between 0 and 100
        return max(0, min(100, score)) 