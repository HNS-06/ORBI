from sqlmodel import Session, select
from app.models.database import User, StudySession
from datetime import datetime, timedelta

class AnalyticsService:
    @staticmethod
    def calculate_xp(duration_seconds: int, recall_score: int = 0) -> int:
        """Calculate XP based on focus time and recall quality."""
        base_xp = duration_seconds // 60 # 1 XP per minute
        bonus_xp = recall_score * 0.5 # Bonus for recall score
        return int(base_xp + bonus_xp)

    @staticmethod
    def update_streak(user: User, db: Session):
        """Update daily streak logic."""
        if not user.last_login:
            user.streak = 1
        else:
            now = datetime.utcnow()
            delta = now.date() - user.last_login.date()
            if delta.days == 1:
                user.streak += 1
            elif delta.days > 1:
                user.streak = 1
        
        user.last_login = datetime.utcnow()
        db.add(user)
        db.commit()

    @staticmethod
    def get_user_stats(user_id: int, db: Session):
        """Aggregate stats for dashboard."""
        sessions = db.exec(select(StudySession).where(StudySession.user_id == user_id)).all()
        total_time = sum(s.duration_seconds for s in sessions)
        avg_score = sum(s.recall_score for s in sessions if s.recall_score) / len([s for s in sessions if s.recall_score]) if sessions else 0
        
        return {
            "total_study_minutes": total_time // 60,
            "average_recall_score": round(avg_score, 1),
            "sessions_completed": len(sessions),
            "mastery_level": int(total_time / 3600) + 1 # Simple level logic
        }
