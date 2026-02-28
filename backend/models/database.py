"""
Database models for LearnLens — SQLAlchemy + SQLite
"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./learnlens.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    num_chunks = Column(Integer, default=0)
    num_pages = Column(Integer, default=0)
    topics = Column(JSON, default=list)  # list of topic strings
    status = Column(String, default="processing")  # processing | ready | error

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="document", cascade="all, delete-orphan")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    text = Column(Text, nullable=False)
    page_num = Column(Integer)
    chunk_index = Column(Integer)
    topic = Column(String, nullable=True)

    document = relationship("Document", back_populates="chunks")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    topic = Column(String, nullable=True)
    difficulty = Column(String, default="medium")  # easy | medium | hard
    created_at = Column(DateTime, default=datetime.utcnow)
    completed = Column(Boolean, default=False)
    score = Column(Float, nullable=True)

    document = relationship("Document", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_type = Column(String, default="mcq")  # mcq | short_answer
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # list of strings for MCQ
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    hint_1 = Column(Text, nullable=True)
    hint_2 = Column(Text, nullable=True)
    hint_3 = Column(Text, nullable=True)
    source_chunk = Column(Text, nullable=True)  # context this was derived from

    quiz = relationship("Quiz", back_populates="questions")
    progress = relationship("QuestionProgress", back_populates="question", cascade="all, delete-orphan")


class QuestionProgress(Base):
    __tablename__ = "question_progress"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    attempts = Column(Integer, default=0)
    correct = Column(Boolean, default=False)
    hints_used = Column(Integer, default=0)
    user_answer = Column(Text, nullable=True)
    answered_at = Column(DateTime, nullable=True)
    # SM-2 fields
    ease_factor = Column(Float, default=2.5)
    interval = Column(Integer, default=1)  # days
    next_review = Column(DateTime, nullable=True)

    question = relationship("Question", back_populates="progress")


class UserStats(Base):
    __tablename__ = "user_stats"

    id = Column(Integer, primary_key=True, index=True)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active = Column(DateTime, nullable=True)
    total_questions_answered = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    total_quizzes_completed = Column(Integer, default=0)


# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure a default UserStats row exists
    db = SessionLocal()
    try:
        stats = db.query(UserStats).first()
        if not stats:
            db.add(UserStats())
            db.commit()
    finally:
        db.close()
