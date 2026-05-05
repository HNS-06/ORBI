from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models.database import User, Session as StudySession
from app.core.database import get_session
from datetime import datetime
from typing import List

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/start")
async def start_session(user_id: int, topic: str, companion_id: str, db: Session = Depends(get_session)):
    new_session = StudySession(
        user_id=user_id,
        topic=topic,
        companion_id=companion_id,
        status="active"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.post("/{session_id}/end")
async def end_session(session_id: int, duration: int, interruptions: int, db: Session = Depends(get_session)):
    session = db.get(StudySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.status = "completed"
    session.duration_seconds = duration
    session.interruptions = interruptions
    session.ended_at = datetime.utcnow()
    
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("/user/{user_id}", response_model=List[StudySession])
async def get_user_sessions(user_id: int, db: Session = Depends(get_session)):
    statement = select(StudySession).where(StudySession.user_id == user_id).order_by(StudySession.created_at.desc())
    results = db.exec(statement)
    return results.all()
