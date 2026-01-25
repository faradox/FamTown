#!/usr/bin/env python3
"""
CLI script to create a new user in FamTown
Usage: python create_user.py <username> <email> <password> [firstName] [lastName]
"""

import sys
import os
import asyncio
import uuid

# Add current directory to path to import backend modules
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import db_manager, User
from app.services.auth_service import hash_password
from sqlalchemy import select


async def create_user(username: str, email: str, password: str, first_name: str = None, last_name: str = None):
    """
    Create a new user
    
    Args:
        username: Username (must be unique)
        email: Email address (must be unique)
        password: Plain text password (will be hashed)
        first_name: Optional first name
        last_name: Optional last name
    """
    try:
        # Initialize database
        await db_manager.initialize_database()
        
        async with db_manager.get_session() as session:
            # Check if username already exists
            result = await session.execute(select(User).where(User.username == username))
            if result.scalar_one_or_none():
                print(f"Error: Username '{username}' already exists")
                return False
            
            # Check if email already exists
            result = await session.execute(select(User).where(User.email == email))
            if result.scalar_one_or_none():
                print(f"Error: Email '{email}' already exists")
                return False
            
            # Create new user
            user_id = str(uuid.uuid4())
            hashed_password = hash_password(password)
            
            user = User(
                id=user_id,
                username=username,
                email=email,
                passwordHash=hashed_password,
                firstName=first_name,
                lastName=last_name
            )
            
            session.add(user)
            await session.commit()

            print(f"Successfully created user:")
            print(f"  ID: {user_id}")
            print(f"  Username: {username}")
            print(f"  Email: {email}")
            if first_name or last_name:
                print(f"  Name: {first_name or ''} {last_name or ''}".strip())
            
            return True
    
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    
    finally:
        await db_manager.close()


def main():
    """Main entry point"""
    if len(sys.argv) < 4:
        print("Usage: python create_user.py <username> <email> <password> [firstName] [lastName]")
        print("\nExample:")
        print("  python create_user.py nawel nawel@example.com secure123 Nawel")
        print("  python create_user.py felix felix@example.com pass456 Felix Schmidt")
        sys.exit(1)
    
    username = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    first_name = sys.argv[4] if len(sys.argv) > 4 else None
    last_name = sys.argv[5] if len(sys.argv) > 5 else None
    
    # Run async function
    success = asyncio.run(create_user(username, email, password, first_name, last_name))
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

