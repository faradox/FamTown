"""
Database management system.
Handles PostgreSQL connections for user, project, and chat data.
"""

import os
import logging
import sys
import subprocess

# SQLAlchemy imports
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, func, ForeignKey, Boolean, Numeric, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from contextlib import asynccontextmanager

# Import settings after SQLAlchemy to avoid circular imports
from config import settings

logger = logging.getLogger(__name__)

# ============ DATABASE MODELS ============

Base = declarative_base()

class User(Base):
    """User model"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    passwordHash = Column(String, nullable=False)
    firstName = Column(String, nullable=True)
    lastName = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    interests = Column(String, nullable=True)
    lastLogin = Column(DateTime(timezone=True), nullable=True)
    preferences = Column(JSON, nullable=True, default=dict)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PasswordResetToken(Base):
    """Password reset token model"""
    __tablename__ = "password_reset_tokens"
    
    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    expiresAt = Column(DateTime(timezone=True), nullable=False)
    usedAt = Column(DateTime(timezone=True), nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User")


class Event(Base):
    """Event model for calendar entries"""
    __tablename__ = "events"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    startDate = Column(DateTime(timezone=True), nullable=False)
    endDate = Column(DateTime(timezone=True), nullable=True)
    location = Column(JSON, nullable=True)  # {address: str, lat: float, lng: float}
    createdBy = Column(String, ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    creator = relationship("User")


class Picture(Base):
    """Picture model for photo storage"""
    __tablename__ = "pictures"
    
    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)
    caption = Column(Text, nullable=True)
    createdBy = Column(String, ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    creator = relationship("User")


class File(Base):
    """File model for document storage"""
    __tablename__ = "files"
    
    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    path = Column(String, nullable=False)
    mimeType = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    createdBy = Column(String, ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    creator = relationship("User")


class Text(Base):
    """Text model for notes, wishes, recipes, etc."""
    __tablename__ = "texts"
    
    id = Column(String, primary_key=True)
    content = Column(Text, nullable=False)
    textType = Column(String, nullable=False)  # wish, insight, recipe, movie_idea, quote
    createdBy = Column(String, ForeignKey("users.id"), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    creator = relationship("User")


class TownsquareItem(Base):
    """Townsquare item linking objects to canvas positions"""
    __tablename__ = "townsquare_items"

    id = Column(String, primary_key=True)
    objectType = Column(String, nullable=False)  # event, picture, file, text
    objectId = Column(String, nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    zIndex = Column(Integer, nullable=False, default=0)
    rotation = Column(Integer, nullable=False, default=0)
    itemMetadata = Column(JSON, nullable=True, default=dict)  # For storing fontSize, backgroundColor, etc.
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ProfileItem(Base):
    """Profile item linking objects to profile canvas positions"""
    __tablename__ = "profile_items"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    objectType = Column(String, nullable=False)  # event, picture, file, text
    objectId = Column(String, nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    zIndex = Column(Integer, nullable=False, default=0)
    rotation = Column(Integer, nullable=False, default=0)
    itemMetadata = Column(JSON, nullable=True, default=dict)  # For storing fontSize, backgroundColor, etc.
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User")


class ViewConfig(Base):
    """Per-user view configuration stored as arbitrary JSON."""
    __tablename__ = "view_configs"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    viewName = Column(String, nullable=False)  # e.g., townsquare, desk, photos, sky, calendar, profile
    config = Column(JSONB(astext_type=Text()), nullable=False, default=dict)  # arbitrary JSONB per view
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User")


class AccountingCategory(Base):
    """Hierarchical category for accounting entries (max 2 levels) - global/shared"""
    __tablename__ = "accounting_categories"

    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(10), nullable=False)  # 'income' or 'expense'
    parentId = Column(String, ForeignKey("accounting_categories.id"), nullable=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(7), nullable=True)
    sortOrder = Column(Integer, nullable=False, default=0)
    isDefault = Column(Boolean, nullable=False, default=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    parent = relationship("AccountingCategory", remote_side=[id], backref="children")


class AccountingTemplate(Base):
    """Saved entry templates for recurring transactions"""
    __tablename__ = "accounting_templates"

    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    entryType = Column(String(10), nullable=False)  # 'income' or 'expense'
    amount = Column(Numeric(12, 2), nullable=True)
    categoryId = Column(String, ForeignKey("accounting_categories.id"), nullable=False)
    description = Column(String(500), nullable=True)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    sortOrder = Column(Integer, nullable=False, default=0)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User")
    category = relationship("AccountingCategory")


class AccountingEntry(Base):
    """Individual financial transaction record"""
    __tablename__ = "accounting_entries"

    id = Column(String, primary_key=True)
    entryType = Column(String(10), nullable=False)  # 'income' or 'expense'
    amount = Column(Numeric(12, 2), nullable=False)
    categoryId = Column(String, ForeignKey("accounting_categories.id"), nullable=False)
    description = Column(String(500), nullable=True)
    date = Column(Date, nullable=False)
    userId = Column(String, ForeignKey("users.id"), nullable=False)
    templateId = Column(String, ForeignKey("accounting_templates.id"), nullable=True)
    accountId = Column(String, nullable=True)  # Reserved for future use
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User")
    category = relationship("AccountingCategory")
    template = relationship("AccountingTemplate")


class DatabaseManager:
    """
    Manages PostgreSQL database connections and operations for the FamTown backend
    """
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        self.is_initialized = False

    async def initialize_database(self):
        """Initialize the database connection"""
        if self.is_initialized:
            return
            
        try:
            # Create async engine with asyncpg driver
            database_url = settings.DATABASE_URL
            # Convert postgresql:// to postgresql+asyncpg:// for async support
            if database_url.startswith("postgresql://"):
                database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
            
            self.engine = create_async_engine(
                database_url,
                echo=False,            # ✅ FIX: Disable SQL query spam
                # ✅ FIX: Use proper connection pooling for production
                pool_size=10,          # Number of permanent connections to maintain
                max_overflow=20,       # Additional connections beyond pool_size
                pool_timeout=30,       # Timeout to get connection from pool
                pool_pre_ping=True,    # Validate connections before use
                pool_recycle=3600,     # Recycle connections after 1 hour
                connect_args={
                    "server_settings": {
                        "application_name": "famtown_backend",
                    }
                }
            )
            
            # Create session factory
            self.session_factory = async_sessionmaker(
                self.engine, 
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            # Create tables
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            # Mark initialized before running migrations so migration runner can open sessions
            self.is_initialized = True
            logger.info("Database initialized successfully")

            # Ensure application migrations are applied (e.g., detections table)
            try:
                backend_dir = os.path.dirname(os.path.abspath(__file__))
            
                # Set environment variables for Alembic
                env = os.environ.copy()
                env['DATABASE_URL'] = settings.DATABASE_URL
                
                # Run alembic upgrade head
                subprocess.run(
                    [sys.executable, '-m', 'alembic', 'upgrade', 'head'],
                    cwd=backend_dir,
                    env=env,
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                logger.info("Alembic migrations completed successfully")
                logger.info("Migrations ensured during database initialization")
            except Exception as mig_err:
                logger.warning(f"Migration ensure skipped/failed during init: {mig_err}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    @asynccontextmanager
    async def get_session(self):
        """Get a database session"""
        if not self.is_initialized:
            await self.initialize_database()
            
        async with self.session_factory() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                raise
            finally:
                await session.close()

    async def close(self):
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()
        self.is_initialized = False
        logger.info("Database connections closed")


# ============ GLOBAL DATABASE MANAGER ============

# Global database manager instance
db_manager = DatabaseManager()

# Export models for easier importing
__all__ = [
    'User',
    'Event',
    'Picture',
    'File',
    'Text',
    'TownsquareItem',
    'ProfileItem',
    'ViewConfig',
    'AccountingCategory',
    'AccountingTemplate',
    'AccountingEntry',
]