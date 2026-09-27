from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime

DATABASE_URL = "sqlite:///./reviews.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    saved_programs = relationship("SavedProgram", back_populates="user", cascade="all, delete-orphan")
    execution_history = relationship("ExecutionHistory", back_populates="user", cascade="all, delete-orphan")
    review_history = relationship("ReviewHistory", back_populates="user")

class PracticeQuestion(Base):
    __tablename__ = "practice_questions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    language = Column(String(30), default="python")
    difficulty = Column(String(20), default="Easy") # Easy, Medium, Hard
    original_code = Column(Text, nullable=False)
    sample_input = Column(Text, default="")
    expected_output = Column(Text, default="")
    category = Column(String(50), default="Basics")
    created_at = Column(DateTime, default=datetime.utcnow)

class SavedProgram(Base):
    __tablename__ = "saved_programs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("practice_questions.id"), nullable=True)
    title = Column(String(150), default="Untitled Program")
    file_name = Column(String(100), default="program.py")
    language = Column(String(30), default="python")
    original_code = Column(Text, default="")
    code = Column(Text, nullable=False)
    sample_input = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="saved_programs")
    question = relationship("PracticeQuestion")

class ExecutionHistory(Base):
    __tablename__ = "execution_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_name = Column(String(150), default="Custom Practice")
    file_name = Column(String(100), default="program.py")
    language = Column(String(30), default="python")
    code = Column(Text, nullable=False)
    input_data = Column(Text, default="")
    output_data = Column(Text, default="")
    error_data = Column(Text, default="")
    status = Column(String(30), default="success") # success, runtime_error, compilation_error, timeout
    execution_time_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="execution_history")

class ReviewHistory(Base):
    __tablename__ = "review_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    language = Column(String, index=True)
    explanation_language = Column(String, default="en")
    issues_count = Column(Integer, default=0)
    has_errors = Column(Boolean, default=False)
    execution_status = Column(String, default="not_executed")
    code_snippet = Column(Text)

    user = relationship("User", back_populates="review_history")

# Create tables
Base.metadata.create_all(bind=engine)

def auto_migrate_db():
    """Ensure missing columns in existing SQLite tables are automatically migrated."""
    import sqlite3
    try:
        conn = sqlite3.connect("reviews.db")
        cursor = conn.cursor()
        
        # Check review_history table columns
        cursor.execute("PRAGMA table_info(review_history)")
        rev_cols = [c[1] for c in cursor.fetchall()]
        if rev_cols and "user_id" not in rev_cols:
            cursor.execute("ALTER TABLE review_history ADD COLUMN user_id INTEGER")
            conn.commit()
            
        conn.close()
    except Exception as e:
        print(f"Auto-migration notice: {e}")

auto_migrate_db()
