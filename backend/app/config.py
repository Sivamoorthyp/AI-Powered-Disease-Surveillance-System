import os

class Settings:
    PROJECT_NAME: str = "Odisha Disease Surveillance & Outbreak Intelligence Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ODISHA_SURVEILLANCE_SECRET_KEY_2026_SECURE_TOKEN_JWT")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Fully local SQLite database for GIS & surveillance tracking
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./odisha_surveillance.db")

settings = Settings()
