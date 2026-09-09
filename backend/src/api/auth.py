import os
import json
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.core.config import settings

# Initialize Firebase Admin using the service account JSON file
try:
    if not firebase_admin._apps:
        if settings.firebase_service_account_json:
            cred_dict = json.loads(settings.firebase_service_account_json)
            cred = credentials.Certificate(cred_dict)
        else:
            # Fallback to local file for development if no env var
            cred_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "legalview-ravi_k.json")
            cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    # Initialize Async Firestore DB Client
    from firebase_admin import firestore_async
    db = firestore_async.client()
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
            "is_guest": decoded_token.get("firebase", {}).get("sign_in_provider") == "anonymous"
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
