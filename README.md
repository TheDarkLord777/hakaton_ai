# AutoClientAI – Smart Reception & Recommendation System

A web application that acts as a receptionist assistant in a car showroom. It uses face recognition to detect returning clients, registers new ones, and generates personalized car recommendations.

## Features

- **Face Recognition**: Detect returning clients using face recognition
- **Client Registration**: Register new clients with personal information
- **Smart Recommendations**: Get personalized car recommendations based on client data
- **Admin Dashboard**: View current visitors, client profiles and analytics
- **Analytics**: Track visits by gender, age, and most suggested cars

## Tech Stack

### Backend

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLite/PostgreSQL**: Database for storing client and car data
- **Face Recognition**: Python library for face detection and recognition
- **OpenCV**: Computer vision library for image processing
- **Rule-based Recommendation Engine**: Custom algorithm for car recommendations

### Frontend (Planned)

- **React/Next.js**: Frontend framework
- **TailwindCSS/shadcn/ui**: Styling and components
- **WebRTC**: For camera streaming

## Setup and Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/autoclientai.git
cd autoclientai
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Initialize the database with sample data:

```bash
python -m app.db.init_db
```

5. Run the application:

```bash
uvicorn main:app --reload
```

6. Access the Swagger documentation:
   - Open your browser and go to [http://localhost:8000/docs](http://localhost:8000/docs)

## API Endpoints

- `/api/clients`: Client registration and management
- `/api/visits`: Visit tracking and management
- `/api/cars`: Car catalog management
- `/api/face`: Face recognition and registration
- `/api/analytics`: Statistics and analytics data

## Implementation Flow

1. **Reception Process**:

   - Start webcam
   - Detect face and check in database
   - If found → display profile and log visit
   - If not found → fill registration form manually
   - Show car recommendations based on client profile

2. **Admin Dashboard**:
   - View list of current visitors
   - Access client profiles and history
   - View analytics on visitors and recommendations

## Future Enhancements

- Advanced recommendation system using machine learning
- Integration with CRM systems
- Mobile app for clients
- Appointment scheduling
- Notification system

## License

This project is licensed under the MIT License.
