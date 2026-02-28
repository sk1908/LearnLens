"""
Progress router — dashboard stats, mastery, review queue
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.database import get_db, UserStats, Quiz, Question, QuestionProgress, Document
from services.quiz_engine import get_level

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get user stats — XP, level, streak, totals."""
    stats = db.query(UserStats).first()
    if not stats:
        return {
            "xp": 0, "level": 1, "streak": 0,
            "total_questions": 0, "total_correct": 0,
            "accuracy": 0, "quizzes_completed": 0
        }

    level_info = get_level(stats.xp)

    return {
        "xp": stats.xp,
        "level": level_info["level"],
        "xp_in_level": level_info["xp_in_level"],
        "xp_for_next": level_info["xp_for_next"],
        "level_progress": level_info["progress"],
        "streak": stats.streak,
        "longest_streak": stats.longest_streak,
        "total_questions": stats.total_questions_answered,
        "total_correct": stats.total_correct,
        "accuracy": round(stats.total_correct / max(1, stats.total_questions_answered) * 100, 1),
        "quizzes_completed": stats.total_quizzes_completed,
        "last_active": stats.last_active.isoformat() if stats.last_active else None,
    }


@router.get("/dashboard")
async def get_dashboard(db: Session = Depends(get_db)):
    """Get comprehensive dashboard data — topic mastery, recent quizzes, review queue."""
    stats = db.query(UserStats).first()
    level_info = get_level(stats.xp) if stats else {"level": 1, "xp_in_level": 0, "xp_for_next": 100, "progress": 0, "total_xp": 0}

    # Topic mastery calculation
    topics = {}
    docs = db.query(Document).filter(Document.status == "ready").all()
    for doc in docs:
        for topic in (doc.topics or []):
            if topic not in topics:
                topics[topic] = {"total": 0, "correct": 0, "document": doc.filename}

    # Get question-level progress per topic
    quizzes = db.query(Quiz).all()
    for quiz in quizzes:
        topic = quiz.topic or "General"
        if topic not in topics:
            topics[topic] = {"total": 0, "correct": 0, "document": ""}

        for question in quiz.questions:
            progress = db.query(QuestionProgress).filter(
                QuestionProgress.question_id == question.id,
                QuestionProgress.answered_at.isnot(None)
            ).first()
            if progress:
                topics[topic]["total"] += 1
                if progress.correct:
                    topics[topic]["correct"] += 1

    topic_mastery = []
    for name, data in topics.items():
        mastery = round(data["correct"] / max(1, data["total"]) * 100, 1)
        topic_mastery.append({
            "topic": name,
            "mastery": mastery,
            "total_questions": data["total"],
            "correct": data["correct"],
            "document": data.get("document", ""),
        })

    # Recent quizzes
    recent_quizzes = db.query(Quiz).order_by(Quiz.created_at.desc()).limit(10).all()
    recent = []
    for quiz in recent_quizzes:
        total_q = len(quiz.questions)
        answered = 0
        correct = 0
        for q in quiz.questions:
            prog = db.query(QuestionProgress).filter(
                QuestionProgress.question_id == q.id,
                QuestionProgress.answered_at.isnot(None)
            ).first()
            if prog:
                answered += 1
                if prog.correct:
                    correct += 1

        recent.append({
            "quiz_id": quiz.id,
            "document_id": quiz.document_id,
            "topic": quiz.topic or "General",
            "difficulty": quiz.difficulty,
            "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
            "total_questions": total_q,
            "answered": answered,
            "correct": correct,
            "score": round(correct / max(1, total_q) * 100, 1),
        })

    # Items due for review (spaced repetition)
    review_items = db.query(QuestionProgress).filter(
        QuestionProgress.next_review <= datetime.utcnow(),
        QuestionProgress.answered_at.isnot(None)
    ).limit(20).all()

    review_queue = []
    for item in review_items:
        question = db.query(Question).filter(Question.id == item.question_id).first()
        if question:
            review_queue.append({
                "question_id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,
                "last_attempt": item.answered_at.isoformat() if item.answered_at else None,
                "attempts": item.attempts,
            })

    return {
        "stats": {
            "xp": stats.xp if stats else 0,
            "level": level_info["level"],
            "xp_in_level": level_info["xp_in_level"],
            "xp_for_next": level_info["xp_for_next"],
            "level_progress": level_info["progress"],
            "streak": stats.streak if stats else 0,
            "longest_streak": stats.longest_streak if stats else 0,
            "total_questions": stats.total_questions_answered if stats else 0,
            "total_correct": stats.total_correct if stats else 0,
            "accuracy": round((stats.total_correct / max(1, stats.total_questions_answered)) * 100, 1) if stats else 0,
        },
        "topic_mastery": sorted(topic_mastery, key=lambda x: x["mastery"], reverse=True),
        "recent_quizzes": recent,
        "review_queue": review_queue,
        "documents_count": len(docs),
    }
