import os
from dotenv import load_dotenv
from typing import Optional
import logging
import secrets

load_dotenv()

logger = logging.getLogger(__name__)

class Settings:
    """Configuration settings for the Python backend"""
    
    # Server Configuration
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    ENVIRONMENT: str = os.getenv(
        "ENVIRONMENT",
        "development" if os.getenv("DEBUG", "false").lower() == "true" else "production",
    )
    APP_NAME: str = os.getenv("APP_NAME", "FamTown")
    APP_DESCRIPTION: str = os.getenv(
        "APP_DESCRIPTION", "Family home dashboard API"
    )
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/famtown")
    
    # JWT Configuration
    JWT_SECRET_KEY: str = None  # Will be set by validation
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    
    # Frontend & CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Model Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")   
    MAIN_MODEL: str = os.getenv("MAIN_MODEL", "gemini-2.5-flash")

    # Upload Configuration
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # Uvicorn workers. Keep at 1: WebSocket connections live in-process, so with
    # more workers a broadcast only reaches clients of the worker that sent it.
    WORKERS: int = int(os.getenv("WORKERS", "1"))

    
    # JWT configuration with validation
    def _validate_jwt_secret(self) -> str:
        """Validate JWT secret key to prevent security vulnerabilities"""
        jwt_secret = os.getenv("JWT_SECRET_KEY", "")
        
        # Check if secret is provided
        if not jwt_secret:
            if self.DEBUG:
                # In development, generate a random secret and warn
                jwt_secret = secrets.token_urlsafe(32)
                logger.warning("No JWT_SECRET_KEY provided. Generated temporary secret for development.")
                logger.warning("Set JWT_SECRET_KEY environment variable for production!")
            else:
                # In production, fail hard
                raise ValueError(
                    "JWT_SECRET_KEY environment variable is required in production. "
                    "Generate a secure secret with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )
        
        # Check if using insecure default
        insecure_defaults = [
            "your-secret-key-here",
            "secret",
            "jwt-secret",
            "default-secret",
            "change-me",
            # Public fallback from docker-compose.yml
            "dev-secret-key-for-development-super-long-enough-for-security",
        ]
        
        if jwt_secret.lower() in insecure_defaults:
            if not self.DEBUG:  # Fail hard in production
                raise ValueError(
                    "Insecure (publicly known) JWT secret detected in production. "
                    "Use a cryptographically secure secret."
                )
            else:
                logger.warning("Insecure JWT secret detected. Use a strong secret in production!")
        
        # Validate minimum length
        if len(jwt_secret) < 32:
            if not self.DEBUG:  # Fail hard in production
                raise ValueError(
                    f"JWT secret too short ({len(jwt_secret)} chars) for production. "
                    "Use at least 32 characters for security."
                )
            else:
                logger.warning(f"JWT secret is short ({len(jwt_secret)} chars). Recommended: 32+ characters.")
        
        return jwt_secret
    
    def __init__(self):
        # Set derived defaults
            
        # Validate JWT secret during initialization
        self.JWT_SECRET_KEY = self._validate_jwt_secret()
        
        # Validate required API keys
        self._validate_api_keys()
    
    def _validate_api_keys(self):
        """Validate optional API keys (Gemini)"""
        if not self.GEMINI_API_KEY:
            logger.warning("No GEMINI_API_KEY found; GenAI features will be disabled")
    

    def validate_required_keys(self) -> bool:
        """Validate that required configuration keys are set"""
        required_keys = [
            ("DATABASE_URL", self.DATABASE_URL),
            ("JWT_SECRET_KEY", self.JWT_SECRET_KEY)
        ]
        
        for key_name, key_value in required_keys:
            if not key_value or key_value in ["your-secret-key-here"]:
                logger.warning(f"{key_name} is not properly configured")
                return False
        
        return True

# Initialize settings to trigger validation
try:
    settings = Settings()
    logger.info("Configuration validation passed")
except Exception as e:
    logger.error(f"Configuration validation failed: {e}")
    raise 