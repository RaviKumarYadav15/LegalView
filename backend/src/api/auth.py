import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.config import settings

# Initialize Firebase Admin using the service account JSON file
cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "legalview-ravi_k.json")
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    # Initialize Firestore DB Client
    from firebase_admin import firestore
    db = firestore.client()
except Exception as e:
    print(f"Error initializing Firebase Admin: {e}")
    db = None

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        # Verify the Firebase JWT token
        decoded_token = auth.verify_id_token(token)
        # return a dict containing user_id and whether they are anonymous
        return {
            "user_id": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "is_guest": decoded_token.get("provider_id") == "anonymous" or "email" not in decoded_token
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
