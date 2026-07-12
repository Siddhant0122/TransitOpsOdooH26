import pytest
from app import auth, models

def test_password_hashing():
    plaintext = "Password123!"
    hashed = auth.hash_password(plaintext)
    
    # Assert stored hash is not equal to plaintext
    assert hashed != plaintext
    
    # Verify password verification works
    assert auth.verify_password(plaintext, hashed) is True
    
    # Assert wrong password fails
    assert auth.verify_password("wrongpassword", hashed) is False

def test_auth_login_flow(client, db):
    # Seed role
    role = models.Role(name=models.RoleName.FLEET_MANAGER)
    db.add(role)
    db.flush()
    
    # Seed user
    plaintext_pw = "MySecurePassword123!"
    hashed_pw = auth.hash_password(plaintext_pw)
    user = models.User(
        email="manager@transitops.dev",
        password_hash=hashed_pw,
        full_name="Fleet Boss",
        role_id=role.id,
        is_active=True
    )
    db.add(user)
    db.commit()
    
    # Test valid credentials
    response = client.post("/auth/login", json={
        "email": "manager@transitops.dev",
        "password": plaintext_pw
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    
    # Test invalid credentials
    response = client.post("/auth/login", json={
        "email": "manager@transitops.dev",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    
    # Test disabled account
    user.is_active = False
    db.commit()
    response = client.post("/auth/login", json={
        "email": "manager@transitops.dev",
        "password": plaintext_pw
    })
    assert response.status_code == 403
