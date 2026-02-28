"""
Quizzes router — generate quizzes, answer questions, get hints
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from models.database import get_db, Document, Chunk, Quiz, Question, QuestionProgress, UserStats
from services.llm_service import generate_quiz, generate_hint, evaluate_answer
from services.embedding import find_relevant_chunks
from services.quiz_engine import calculate_sm2, calculate_xp, update_streak, get_adaptive_difficulty

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])


class GenerateQuizRequest(BaseModel):
    document_id: int
    topic: Optional[str] = None
    num_questions: int = 5
    difficulty: Optional[str] = None  # auto if not specified


class AnswerRequest(BaseModel):
    question_id: int
    user_answer: str


class HintRequest(BaseModel):
    question_id: int
    hint_level: int  # 1, 2, or 3


@router.post("/generate")
async def generate_quiz_endpoint(req: GenerateQuizRequest, db: Session = Depends(get_db)):
    """Generate a new quiz from a document, optionally filtered by topic."""
    doc = db.query(Document).filter(Document.id == req.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=400, detail="Document is still processing")

    # Determine difficulty adaptively if not specified
    difficulty = req.difficulty
    if not difficulty:
        difficulty = "medium"  # Default

    # Get relevant chunks
    if req.topic:
        # Topic-specific: retrieve chunks matching topic
        chunks = db.query(Chunk).filter(
            Chunk.document_id == req.document_id,
            Chunk.topic == req.topic
        ).all()
        if not chunks:
            # Fallback: use embedding search
            search_chunks = find_relevant_chunks(req.topic, req.document_id, top_k=5)
            context = "\n\n".join([c["text"] for c in search_chunks])
        else:
            context = "\n\n".join([c.text for c in chunks[:5]])
    else:
        # General: use a sample of chunks across the document
        chunks = db.query(Chunk).filter(Chunk.document_id == req.document_id).all()
        # Use every Nth chunk to get coverage
        step = max(1, len(chunks) // 5)
        selected = chunks[::step][:5]
        context = "\n\n".join([c.text for c in selected])

    if not context.strip():
        raise HTTPException(status_code=400, detail="No content available for quiz generation")

    # Generate quiz via LLM
    questions_data = generate_quiz(context, req.num_questions, difficulty)

    # Create quiz in DB
    quiz = Quiz(
        document_id=req.document_id,
        topic=req.topic,
        difficulty=difficulty,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # Create questions
    created_questions = []
    for q_data in questions_data:
        question = Question(
            quiz_id=quiz.id,
            question_type=q_data.get("question_type", "mcq"),
            question_text=q_data.get("question_text", ""),
            options=q_data.get("options"),
            correct_answer=q_data.get("correct_answer", ""),
            explanation=q_data.get("explanation", ""),
            hint_1=q_data.get("hint_1", "Think about the key concepts..."),
            hint_2=q_data.get("hint_2", "Consider the relationships between ideas..."),
            hint_3=q_data.get("hint_3", "Focus on the specific details mentioned..."),
            source_chunk=context[:500],
        )
        db.add(question)
        db.commit()
        db.refresh(question)

        # Create progress entry
        progress = QuestionProgress(question_id=question.id)
        db.add(progress)

        created_questions.append({
            "id": question.id,
            "question_type": question.question_type,
            "question_text": question.question_text,
            "options": question.options,
        })

    db.commit()

    return {
        "quiz_id": quiz.id,
        "document_id": req.document_id,
        "topic": req.topic,
        "difficulty": difficulty,
        "num_questions": len(created_questions),
        "questions": created_questions,
    }


@router.post("/answer")
async def answer_question(req: AnswerRequest, db: Session = Depends(get_db)):
    """Submit an answer to a question and get feedback + XP."""
    question = db.query(Question).filter(Question.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    progress = db.query(QuestionProgress).filter(
        QuestionProgress.question_id == req.question_id
    ).first()

    # Evaluate answer
    if question.question_type == "mcq":
        # For MCQ, do simple comparison
        is_correct = req.user_answer.strip().lower() == question.correct_answer.strip().lower()
        # Also check if answer starts with correct option letter
        if not is_correct and question.options:
            correct_idx = None
            for i, opt in enumerate(question.options):
                if question.correct_answer.strip().lower() in opt.lower():
                    correct_idx = i
                    break
            if correct_idx is not None:
                user_letter = req.user_answer.strip().upper()
                if user_letter == chr(65 + correct_idx):  # A=0, B=1, etc.
                    is_correct = True

        eval_result = {
            "is_correct": is_correct,
            "score": 1.0 if is_correct else 0.0,
            "feedback": "Correct! 🎉" if is_correct else f"Not quite. The correct answer is: {question.correct_answer}"
        }
    else:
        # For short answer, use LLM evaluation
        eval_result = evaluate_answer(question.question_text, question.correct_answer, req.user_answer)

    # Update progress
    if progress:
        progress.attempts += 1
        progress.correct = eval_result.get("is_correct", False)
        progress.user_answer = req.user_answer
        progress.answered_at = datetime.utcnow()

        # SM-2 update
        quality = 5 if eval_result["is_correct"] else (3 if eval_result.get("score", 0) >= 0.5 else 1)
        sm2 = calculate_sm2(quality, progress.ease_factor, progress.interval, progress.attempts)
        progress.ease_factor = sm2["ease_factor"]
        progress.interval = sm2["interval"]
        progress.next_review = sm2["next_review"]

    # Update user stats
    stats = db.query(UserStats).first()
    if stats:
        streak_result = update_streak(stats.last_active)

        if streak_result["streak"] == -1:
            pass  # Same day, no change
        elif streak_result["streak_maintained"]:
            stats.streak += streak_result["streak"]
        else:
            stats.streak = streak_result["streak"]

        stats.longest_streak = max(stats.longest_streak, stats.streak)
        stats.last_active = datetime.utcnow()
        stats.total_questions_answered += 1

        if eval_result.get("is_correct", False):
            stats.total_correct += 1

        # Calculate and add XP
        quiz = db.query(Quiz).filter(Quiz.id == question.quiz_id).first()
        xp_result = calculate_xp(
            is_correct=eval_result.get("is_correct", False),
            hints_used=progress.hints_used if progress else 0,
            difficulty=quiz.difficulty if quiz else "medium",
            streak=stats.streak,
        )
        stats.xp += xp_result["xp_earned"]

    db.commit()

    return {
        "question_id": req.question_id,
        "is_correct": eval_result.get("is_correct", False),
        "score": eval_result.get("score", 0),
        "feedback": eval_result.get("feedback", ""),
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "xp_earned": xp_result["xp_earned"] if stats else 0,
        "xp_breakdown": xp_result.get("breakdown", {}),
    }


@router.post("/hint")
async def get_hint(req: HintRequest, db: Session = Depends(get_db)):
    """Get a Socratic hint for a question (level 1-3)."""
    question = db.query(Question).filter(Question.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if req.hint_level < 1 or req.hint_level > 3:
        raise HTTPException(status_code=400, detail="Hint level must be 1, 2, or 3")

    # Check if pre-generated hints exist
    pre_generated = {
        1: question.hint_1,
        2: question.hint_2,
        3: question.hint_3,
    }

    hint_text = pre_generated.get(req.hint_level)

    # If no pre-generated hint, generate one dynamically
    if not hint_text:
        hint_text = generate_hint(
            question.question_text,
            question.correct_answer,
            req.hint_level,
            question.source_chunk or "",
        )

    # Update progress
    progress = db.query(QuestionProgress).filter(
        QuestionProgress.question_id == req.question_id
    ).first()
    if progress:
        progress.hints_used = max(progress.hints_used, req.hint_level)
        db.commit()

    return {
        "question_id": req.question_id,
        "hint_level": req.hint_level,
        "hint_text": hint_text,
        "hints_remaining": 3 - req.hint_level,
    }


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    """Get quiz details with all questions."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = []
    for q in quiz.questions:
        progress = db.query(QuestionProgress).filter(
            QuestionProgress.question_id == q.id
        ).first()

        questions.append({
            "id": q.id,
            "question_type": q.question_type,
            "question_text": q.question_text,
            "options": q.options,
            "answered": progress.answered_at is not None if progress else False,
            "correct": progress.correct if progress else None,
            "hints_used": progress.hints_used if progress else 0,
        })

    return {
        "quiz_id": quiz.id,
        "document_id": quiz.document_id,
        "topic": quiz.topic,
        "difficulty": quiz.difficulty,
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
        "completed": quiz.completed,
        "score": quiz.score,
        "questions": questions,
    }
