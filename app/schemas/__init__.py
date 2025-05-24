from app.schemas.client import (
    Client, ClientBase, ClientCreate, ClientUpdate, ClientInDB, ClientWithVisits
)
from app.schemas.visit import (
    Visit, VisitBase, VisitCreate, VisitUpdate, VisitInDB, VisitWithClient
)
from app.schemas.car import (
    Car, CarBase, CarCreate, CarUpdate, CarInDB, CarWithInterest
)
from app.schemas.face import (
    FaceEncoding, FaceEncodingBase, FaceEncodingCreate, FaceEncodingInDB, FaceDetectionResult
) 