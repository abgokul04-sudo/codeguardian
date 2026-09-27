import os
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from datetime import datetime

from database.models import (
    SessionLocal, User, PracticeQuestion, SavedProgram, ExecutionHistory, ReviewHistory
)
from auth import (
    get_db, hash_password, verify_password, create_access_token,
    get_current_user, get_optional_user
)
from agents.review_manager import (
    get_review, get_walkthrough, chat_about_code, get_translation, get_beginner_analysis
)
from agents.code_executor import execute_code

load_dotenv(override=True)

app = FastAPI(title="CodeGuardian — AI Code Practice & Tutoring Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- SEED QUESTIONS -----------------
DEFAULT_QUESTIONS = [
    {
        "title": "Sum of Two Numbers",
        "description": "Write a program that takes two numbers as input from the user, calculates their sum, and prints the result.",
        "language": "python",
        "difficulty": "Easy",
        "original_code": 'num1 = int(input("Enter first number: "))\nnum2 = int(input("Enter second number: "))\ntotal = num1 + num2\nprint(f"The sum is: {total}")',
        "sample_input": "10\n20\n",
        "expected_output": "The sum is: 30",
        "category": "Basics"
    },
    {
        "title": "Even or Odd Checker",
        "description": "Write a program that takes an integer and checks whether the number is Even or Odd using the modulo operator (%).",
        "language": "python",
        "difficulty": "Easy",
        "original_code": 'number = int(input("Enter a number: "))\nif number % 2 == 0:\n    print(f"{number} is Even")\nelse:\n    print(f"{number} is Odd")',
        "sample_input": "7\n",
        "expected_output": "7 is Odd",
        "category": "Conditionals"
    },
    {
        "title": "Find Largest of Three Numbers",
        "description": "Create a program that accepts three numbers and determines the largest among them.",
        "language": "python",
        "difficulty": "Easy",
        "original_code": 'a = int(input("Enter a: "))\nb = int(input("Enter b: "))\nc = int(input("Enter c: "))\nlargest = max(a, b, c)\nprint(f"The largest number is: {largest}")',
        "sample_input": "15\n42\n28\n",
        "expected_output": "The largest number is: 42",
        "category": "Conditionals"
    },
    {
        "title": "Print Numbers 1 to N Loop",
        "description": "Write a program using a loop that prints numbers from 1 to N.",
        "language": "python",
        "difficulty": "Easy",
        "original_code": 'n = int(input("Enter n: "))\nfor i in range(1, n + 1):\n    print(i)',
        "sample_input": "5\n",
        "expected_output": "1\n2\n3\n4\n5",
        "category": "Loops"
    },
    {
        "title": "Reverse a String",
        "description": "Write a function or program that reverses a user-provided string.",
        "language": "python",
        "difficulty": "Medium",
        "original_code": 'text = input("Enter a string: ")\nreversed_text = text[::-1]\nprint(f"Reversed: {reversed_text}")',
        "sample_input": "CodeGuardian\n",
        "expected_output": "Reversed: naidrauGedoC",
        "category": "Strings"
    },
    {
        "title": "Array Sum in JavaScript",
        "description": "Calculate the sum of all elements inside an array in JavaScript.",
        "language": "javascript",
        "difficulty": "Easy",
        "original_code": 'const numbers = [10, 20, 30, 40, 50];\nlet sum = 0;\nfor (let i = 0; i < numbers.length; i++) {\n  sum += numbers[i];\n}\nconsole.log(`Total Sum: ${sum}`);',
        "sample_input": "",
        "expected_output": "Total Sum: 150",
        "category": "Arrays"
    }
]

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        if db.query(PracticeQuestion).count() == 0:
            for q in DEFAULT_QUESTIONS:
                db.add(PracticeQuestion(**q))
            db.commit()
    finally:
        db.close()

# ----------------- PYDANTIC SCHEMAS -----------------
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class SaveProgramRequest(BaseModel):
    title: str
    file_name: str
    language: str
    code: str
    original_code: Optional[str] = ""
    sample_input: Optional[str] = ""
    question_id: Optional[int] = None

class SaveProgramUpdate(BaseModel):
    title: Optional[str] = None
    file_name: Optional[str] = None
    code: Optional[str] = None
    sample_input: Optional[str] = None

class ExecuteRequest(BaseModel):
    language: str
    code: str
    standardInput: Optional[str] = ""
    question_name: Optional[str] = "Custom Practice"
    file_name: Optional[str] = "program.py"

class AnalyzeRequest(BaseModel):
    language: str
    code: str
    explanationLanguage: Optional[str] = "en"

class ReviewRequest(BaseModel):
    language: str
    code: str
    explanationLanguage: Optional[str] = "en"
    standardInput: Optional[str] = ""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    code: str
    language: str
    explanationLanguage: Optional[str] = "en"
    reviewContext: Optional[Dict[str, Any]] = {}
    messages: List[ChatMessage]

class TranslateRequest(BaseModel):
    code: str
    sourceLanguage: Optional[str] = "python"
    targetLanguage: str
    explanationLanguage: Optional[str] = "en"

# ----------------- HEALTH ENDPOINT -----------------
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "CodeGuardian Practice Platform"}

# ----------------- AUTHENTICATION ENDPOINTS -----------------
@app.post("/api/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    
    # Check if username or email exists
    if db.query(User).filter(User.username == req.username.strip()).first():
        raise HTTPException(status_code=400, detail="Username is already taken. Please choose another.")
    if db.query(User).filter(User.email == req.email.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Email is already registered. Please log in.")

    hashed = hash_password(req.password)
    new_user = User(
        username=req.username.strip(),
        email=req.email.strip().lower(),
        password_hash=hashed
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": str(new_user.id), "username": new_user.username})
    return {
        "success": True,
        "token": token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "created_at": new_user.created_at.isoformat()
        }
    }

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    identifier = req.username_or_email.strip()
    user = db.query(User).filter((User.username == identifier) | (User.email == identifier.lower())).first()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password. Please try again."
        )

    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat()
        }
    }

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved_count = db.query(SavedProgram).filter(SavedProgram.user_id == user.id).count()
    exec_count = db.query(ExecutionHistory).filter(ExecutionHistory.user_id == user.id).count()
    completed_count = db.query(ExecutionHistory).filter(
        ExecutionHistory.user_id == user.id,
        ExecutionHistory.status == "success"
    ).count()

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat()
        },
        "stats": {
            "saved_programs": saved_count,
            "executions_total": exec_count,
            "successful_runs": completed_count,
            "attempted_questions": len(set([
                h.question_name for h in db.query(ExecutionHistory.question_name).filter(ExecutionHistory.user_id == user.id).all()
            ]))
        }
    }

@app.put("/api/auth/profile")
def update_profile(req: ProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.username and req.username.strip() != user.username:
        if db.query(User).filter(User.username == req.username.strip(), User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Username already in use.")
        user.username = req.username.strip()

    if req.email and req.email.strip().lower() != user.email:
        if db.query(User).filter(User.email == req.email.strip().lower(), User.id != user.id).first():
            raise HTTPException(status_code=400, detail="Email already in use.")
        user.email = req.email.strip().lower()

    if req.new_password:
        if not req.current_password or not verify_password(req.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")
        if len(req.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
        user.password_hash = hash_password(req.new_password)

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at.isoformat()
        }
    }

# ----------------- PRACTICE QUESTIONS -----------------
@app.get("/api/questions")
def list_questions(db: Session = Depends(get_db)):
    questions = db.query(PracticeQuestion).all()
    return {"questions": questions}

@app.get("/api/questions/{qid}")
def get_question(qid: int, db: Session = Depends(get_db)):
    q = db.query(PracticeQuestion).filter(PracticeQuestion.id == qid).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"question": q}

# ----------------- CODE EXECUTION WITH HISTORY -----------------
@app.post("/api/execute")
def execute_endpoint(
    req: ExecuteRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    
    try:
        res = execute_code(
            language=req.language,
            code=req.code,
            standard_input=req.standardInput or ""
        )
        
        # Save to ExecutionHistory if user is logged in
        if user:
            hist_entry = ExecutionHistory(
                user_id=user.id,
                question_name=req.question_name or "Practice Program",
                file_name=req.file_name or f"program.{req.language}",
                language=req.language,
                code=req.code,
                input_data=req.standardInput or "",
                output_data=res.get("output", ""),
                error_data=res.get("error", ""),
                status=res.get("status", "success"),
                execution_time_ms=res.get("execution_time_ms", 0.0)
            )
            db.add(hist_entry)
            db.commit()

        return {"success": True, "result": res}
    except Exception as e:
        print(f"Error during execution: {e}")
        return {"success": False, "error": str(e)}

# ----------------- SAVED PROGRAMS -----------------
@app.get("/api/saved-programs")
def get_saved_programs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    programs = db.query(SavedProgram).filter(
        SavedProgram.user_id == user.id
    ).order_by(SavedProgram.updated_at.desc()).all()
    return {"programs": programs}

@app.post("/api/saved-programs")
def create_saved_program(
    req: SaveProgramRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Cannot save empty program.")

    prog = SavedProgram(
        user_id=user.id,
        question_id=req.question_id,
        title=req.title.strip() if req.title else "Untitled Practice",
        file_name=req.file_name.strip() if req.file_name else f"program.{req.language}",
        language=req.language,
        original_code=req.original_code or "",
        code=req.code,
        sample_input=req.sample_input or ""
    )
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return {"success": True, "program": prog}

@app.put("/api/saved-programs/{pid}")
def update_saved_program(
    pid: int,
    req: SaveProgramUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prog = db.query(SavedProgram).filter(SavedProgram.id == pid, SavedProgram.user_id == user.id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Saved program not found.")

    if req.title is not None:
        prog.title = req.title.strip()
    if req.file_name is not None:
        prog.file_name = req.file_name.strip()
    if req.code is not None:
        prog.code = req.code
    if req.sample_input is not None:
        prog.sample_input = req.sample_input

    prog.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prog)
    return {"success": True, "program": prog}

@app.delete("/api/saved-programs/{pid}")
def delete_saved_program(
    pid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prog = db.query(SavedProgram).filter(SavedProgram.id == pid, SavedProgram.user_id == user.id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Saved program not found.")
    db.delete(prog)
    db.commit()
    return {"success": True, "message": "Program deleted successfully."}

# ----------------- PRACTICE HISTORY -----------------
@app.get("/api/practice-history")
def get_practice_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(ExecutionHistory).filter(
        ExecutionHistory.user_id == user.id
    ).order_by(ExecutionHistory.created_at.desc()).limit(100).all()
    return {"history": history}

# ----------------- BEGINNER CODE ANALYSIS -----------------
@app.post("/api/analyze")
def analyze_endpoint(req: AnalyzeRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    
    try:
        analysis = get_beginner_analysis(
            language=req.language,
            code=req.code,
            explanation_language=req.explanationLanguage or "en"
        )
        if "error" in analysis:
            return {"success": False, "error": analysis["error"]}
        return {"success": True, "analysis": analysis}
    except Exception as e:
        print(f"Error during analysis: {e}")
        return {"success": False, "error": str(e)}

# ----------------- CODE REVIEW & AI TUTOR -----------------
@app.post("/api/review")
def review_code(
    req: ReviewRequest,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    
    try:
        expl_lang = req.explanationLanguage or "en"
        review_data = get_review(
            req.language, req.code, explanation_language=expl_lang,
            standard_input=req.standardInput or ""
        )
        
        if "error" in review_data:
            return {"success": False, "error": review_data["error"]}
        
        errors_count = len(review_data.get("errors_found", []))
        potential_count = len(review_data.get("potential_problems", []))
        total_issues = errors_count + potential_count
        
        history_entry = ReviewHistory(
            user_id=user.id if user else None,
            language=req.language,
            explanation_language=expl_lang,
            issues_count=total_issues,
            has_errors=errors_count > 0,
            execution_status=review_data.get("execution", {}).get("status", "unknown"),
            code_snippet=req.code[:120] + "..." if len(req.code) > 120 else req.code
        )
        db.add(history_entry)
        db.commit()
        
        return {"success": True, "review": review_data}
    
    except Exception as e:
        print(f"Error during review: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
    
    try:
        response_text = chat_about_code(
            code=req.code,
            language=req.language,
            explanation_language=req.explanationLanguage or "en",
            review_context=req.reviewContext or {},
            messages=[m.dict() for m in req.messages]
        )
        return {"success": True, "response": response_text}
    except Exception as e:
        print(f"Error during chat: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/walkthrough")
def walkthrough_code(req: ReviewRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    
    try:
        walkthrough_data = get_walkthrough(req.language, req.code, req.explanationLanguage or "en")
        if "error" in walkthrough_data:
            return {"success": False, "error": walkthrough_data["error"]}
        return {"success": True, "walkthrough": walkthrough_data.get("walkthrough", [])}
    except Exception as e:
        print(f"Error during walkthrough: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/translate")
def translate_endpoint(req: TranslateRequest):
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty")
    
    try:
        res = get_translation(
            code=req.code,
            source_language=req.sourceLanguage or "python",
            target_language=req.targetLanguage,
            explanation_language=req.explanationLanguage or "en"
        )
        if "error" in res:
            return {"success": False, "error": res["error"]}
        return {"success": True, "translation": res}
    except Exception as e:
        print(f"Error during translation: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/history")
def get_history(user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(ReviewHistory)
    if user:
        query = query.filter((ReviewHistory.user_id == user.id) | (ReviewHistory.user_id == None))
    history = query.order_by(ReviewHistory.created_at.desc()).limit(50).all()
    return {"history": history}
