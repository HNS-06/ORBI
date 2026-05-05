from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    companion_id: str = "encourager"
    xp: int = 0
    level: int = 1
    streak: int = 0
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    sessions: List["Session"] = Relationship(back_populates="user")
    memories: List["Memory"] = Relationship(back_populates="user")

class Session(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    topic: str
    companion_id: str
    status: str = "active" # active, paused, recall, completed
    duration_seconds: int = 0
    interruptions: int = 0
    recall_score: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    user: User = Relationship(back_populates="sessions")

class Memory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    subject: str
    last_score: int
    weak_points: str # JSON string or comma separated
    last_studied: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="memories")
