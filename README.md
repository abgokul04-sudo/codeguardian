# CodeGuardian - AI Programming Tutor & Code Review Agent

An intelligent, multilingual AI Code Review Agent and Programming Tutor that analyzes code, captures actual program execution output, explains bugs with exact line breakdowns, provides minimal code corrections, generates visual step-by-step walkthroughs, and engages in code-aware Q&A in multiple Indian and international languages.

---

## 🌟 Key Features

1. **🔍 Code Review + Output**:
   - Analyzes source code for bugs, errors, potential issues, and correct parts.
   - Executes the code safely to display the actual console output (`stdout` / `stderr`).
   - If execution fails, displays the runtime error trace and explains why it occurred.

2. **📊 Score-Free Actionable Feedback**:
   - Arbitrary numeric score (e.g. `75/100`) is replaced with actionable insights:
     - ✅ **Correct parts**
     - ❌ **Errors found**
     - ⚠️ **Potential problems / edge cases**
     - 💡 **Suggestions**
     - 🔧 **Minimal Improved code**

3. **🐛 Exact Line Issues + Multilingual Explanations**:
   - For every problem, shows exact **Line**, **Problem**, **Why it happens**, and **Suggested fix**.
   - Supports 5 human explanation languages:
     - 🇬🇧 **English**
     - 🇮🇳 **Tamil (தமிழ்)**
     - 🇮🇳 **Telugu (తెలుగు)**
     - 🇮🇳 **Hindi (हिन्दी)**
     - 🇮🇳 **Malayalam (മലയാളം)**
   - The code itself strictly preserves its original programming language and syntax.

4. **🔧 Minimal Code Fixes (No Unnecessary Rewriting)**:
   - Preserves user code structure, style, and variable names.
   - Changes only the problematic lines.

5. **🎓 Step-by-Step Visual Walkthrough**:
   - Visual execution flow: `Input ➔ Processing ➔ Function/Logic ➔ Result ➔ Output`.
   - Displays step-by-step state changes and variables.

6. **🤖 Context-Aware AI Programming Tutor Chatbot**:
   - Integrated chatbot below the walkthrough.
   - Grounded in current code and review context.
   - Answers questions in the user's selected language (Tamil, Telugu, Hindi, Malayalam, English).

7. **📋 Structured Review Report & Markdown Download**:
   - Exports the complete structured review report as clean Markdown.

---

## 🚀 Supported Programming Languages

- Python 🐍
- JavaScript ⚡
- Java ☕
- C++ ⚙️
- C 🔧
- C# 🎯
- TypeScript 📘
- Go 🐹
- PHP 🐘

---

## 🛠️ Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.
