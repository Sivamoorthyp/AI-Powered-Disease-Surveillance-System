from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError
from typing import Optional

from app.database import get_db
from app import crud, models, schemas
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

import datetime

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = None
    
    # 1. Check identifier type
    if login_data.email:
        user = crud.get_user_by_email(db, login_data.email)
    elif login_data.phone:
        user = crud.get_user_by_phone(db, login_data.phone)
    elif login_data.emp_id:
        user = crud.get_user_by_emp_id(db, login_data.emp_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Employee ID / Email / Phone not registered.",
        )

    # 2. Check Password or OTP
    # For demo ease, if OTP login is chosen, any OTP matching '123456' is accepted
    if login_data.otp:
        if login_data.otp != "123456":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid OTP code. Use 123456 for demo authentication.",
            )
    else:
        # Check standard password hashing
        if not login_data.password or not crud.verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password.",
            )

    # 3. Create Access Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": user.email or user.phone or user.emp_id,
        "role": user.role,
        "name": user.name,
        "district": user.district
    }
    
    access_token = create_access_token(
        data=token_payload, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "emp_id": user.emp_id,
        "district": user.district
    }

@router.post("/register", response_model=schemas.UserOut)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    if user_data.email and crud.get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if user_data.phone and crud.get_user_by_phone(db, user_data.phone):
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if user_data.emp_id and crud.get_user_by_emp_id(db, user_data.emp_id):
        raise HTTPException(status_code=400, detail="Employee ID already registered")

    user_obj = models.User(
        email=user_data.email,
        phone=user_data.phone,
        emp_id=user_data.emp_id,
        name=user_data.name,
        role=user_data.role,
        hashed_password=user_data.password,
        district=user_data.district,
        block=user_data.block,
        village=user_data.village
    )
    return crud.create_user(db, user_obj)
