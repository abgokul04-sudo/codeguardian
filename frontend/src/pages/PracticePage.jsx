import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { 
  getQuestions, getQuestionById, getSavedPrograms, saveProgram, 
  updateSavedProgram, executeCode, analyzeCode 
} from '../services/api';
import { 
  Play, RotateCcw, Save, Sparkles, BookOpen, Terminal, CheckCircle, 
  AlertCircle, Clock, Copy, Check, FileCode, Edit3, Trash2, HelpCircle,
  Layers, Code2, ChevronRight, Download, Send, ArrowRight
} from 'lucide-react';

const LANGUAGE_EXTENSIONS = {
  python: 'py',
  javascript: 'js',
  typescript: 'ts',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  go: 'go',
  php: 'php',
  rust: 'rs'
};

const PROGRAMMING_LANGUAGES = [
  { value: 'python', label: 'Python 🐍' },
  { value: 'javascript', label: 'JavaScript ⚡' },
  { value: 'typescript', label: 'TypeScript 📘' },
  { value: 'java', label: 'Java ☕' },
  { value: 'cpp', label: 'C++ ⚙️' },
  { value: 'c', label: 'C 🔧' },
  { value: 'csharp', label: 'C# 🎯' },
  { value: 'go', label: 'Go 🐹' },
  { value: 'php', label: 'PHP 🐘' },
  { value: 'rust', label: 'Rust 🦀' }
];

const DEFAULT_SAMPLE_CODES = {
  python: '# Write your Python practice code here\ndef solve():\n    name = input("Enter your name: ")\n    print(f"Hello, {name}!")\n\nsolve()\n',
  javascript: '// Write your JavaScript practice code here\nfunction solve() {\n  console.log("Hello from JavaScript practice!");\n}\n\nsolve();\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java practice!");\n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++ practice!" << endl;\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C practice!\\n");\n    return 0;\n}\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from C# practice!");\n    }\n}\n',
  typescript: 'function solve(msg: string): void {\n  console.log(`Hello: ${msg}`);\n}\n\nsolve("TypeScript");\n',
  go: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Go practice!")\n}\n',
  php: '<?php\necho "Hello from PHP practice!\\n";\n?>',
  rust: 'fn main() {\n    println!("Hello from Rust practice!");\n}\n'
};

export default function PracticePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Selected Question & Program State
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [savedProgramId, setSavedProgramId] = useState(null);

  // Dual Code Storage: Original (Immutable) vs Modified (Practice)
  const [originalCode, setOriginalCode] = useState(DEFAULT_SAMPLE_CODES.python);
  const [practiceCode, setPracticeCode] = useState(DEFAULT_SAMPLE_CODES.python);
  const [activeCodeMode, setActiveCodeMode] = useState('practice'); // 'practice' | 'original'

  // Metadata & Language
  const [language, setLanguage] = useState('python');
  const [fileName, setFileName] = useState('two.py');
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [explanationLanguage, setExplanationLanguage] = useState('en');

  // Input & Output Execution Panel
  const [standardInput, setStandardInput] = useState('');
  const [execState, setExecState] = useState({
    output: '',
    error: '',
    status: '',
    execution_time_ms: 0.0,
    executed: false
  });
  const [executing, setExecuting] = useState(false);

  // Analysis & Beginner Explanation
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  // UI Feedback
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate filename when language changes or question loaded
  const generateNextFileName = (lang, index = 2) => {
    const ext = LANGUAGE_EXTENSIONS[lang] || 'py';
    const numWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const word = numWords[index - 1] || `program_${index}`;
    return `${word}.${ext}`;
  };

  // Load initial question bank and handle URL query parameters
  useEffect(() => {
    const init = async () => {
      try {
        const qRes = await getQuestions();
        if (qRes.questions) {
          setQuestions(qRes.questions);

          const qid = searchParams.get('questionId');
          const sid = searchParams.get('savedId');

          if (qid) {
            const foundQ = qRes.questions.find(q => q.id === parseInt(qid));
            if (foundQ) {
              loadQuestion(foundQ);
            }
          } else if (sid) {
            const sRes = await getSavedPrograms();
            if (sRes.programs) {
              const foundProg = sRes.programs.find(p => p.id === parseInt(sid));
              if (foundProg) {
                loadSavedProgram(foundProg);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load practice questions:', err);
      }
    };
    init();
  }, [searchParams]);

  const loadQuestion = (q) => {
    setSelectedQuestion(q);
    setSavedProgramId(null);
    setLanguage(q.language || 'python');
    setOriginalCode(q.original_code);
    setPracticeCode(q.original_code);
    setActiveCodeMode('practice');
    setStandardInput(q.sample_input || '');
    setFileName(`${q.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${LANGUAGE_EXTENSIONS[q.language] || 'py'}`);
    setExecState({ output: '', error: '', status: '', execution_time_ms: 0.0, executed: false });
    setAnalysisResult(null);
  };

  const loadSavedProgram = (p) => {
    setSavedProgramId(p.id);
    setLanguage(p.language);
    setOriginalCode(p.original_code || p.code);
    setPracticeCode(p.code);
    setActiveCodeMode('practice');
    setStandardInput(p.sample_input || '');
    setFileName(p.file_name);
    setExecState({ output: '', error: '', status: '', execution_time_ms: 0.0, executed: false });
    setAnalysisResult(null);
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const newFile = generateNextFileName(newLang, 2);
    setFileName(newFile);
    const defaultCode = DEFAULT_SAMPLE_CODES[newLang] || `// Practice code in ${newLang}\n`;
    setOriginalCode(defaultCode);
    setPracticeCode(defaultCode);
  };

  // Run Code: compiles and executes current active code with live stdin
  const handleRunCode = async (codeToRun, mode = 'practice') => {
    setExecuting(true);
    setExecState({ output: '', error: '', status: 'running...', execution_time_ms: 0.0, executed: true });
    
    try {
      const qTitle = selectedQuestion ? selectedQuestion.title : 'Custom Practice';
      const res = await executeCode(language, codeToRun, standardInput, qTitle, fileName);
      if (res && res.success && res.result) {
        setExecState(res.result);
      } else {
        setExecState({
          output: '',
          error: res?.error || 'Execution failed.',
          status: 'error',
          execution_time_ms: 0.0,
          executed: true
        });
      }
    } catch (err) {
      setExecState({
        output: '',
        error: 'Error connecting to the code execution server.',
        status: 'error',
        execution_time_ms: 0.0,
        executed: true
      });
    } finally {
      setExecuting(false);
    }
  };

  // Run Original Code: safely executes immutable original code without overwriting user's practice code
  const handleRunOriginalCode = () => {
    handleRunCode(originalCode, 'original');
  };

  // Reset Code: restores practice code back to original code
  const handleResetCode = () => {
    if (window.confirm('Reset practice code back to original code? Your current edits will be restored.')) {
      setPracticeCode(originalCode);
    }
  };

  // Analyze Code: generates beginner-friendly code analysis report & plain English explanation
  const handleAnalyzeCode = async () => {
    const codeToAnalyze = activeCodeMode === 'practice' ? practiceCode : originalCode;
    if (!codeToAnalyze.trim()) return;

    setAnalyzing(true);
    try {
      const res = await analyzeCode(language, codeToAnalyze, explanationLanguage);
      if (res && res.success && res.analysis) {
        setAnalysisResult(res.analysis);
        setAnalysisModalOpen(true);
      } else {
        alert(res?.error || 'Failed to generate code analysis.');
      }
    } catch (err) {
      alert('Error connecting to the code analyzer.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Save Program: saves current question and user's code to database
  const handleSaveProgram = async () => {
    if (!user) {
      alert('Please log in to save your practice programs.');
      navigate('/login');
      return;
    }

    setSaveLoading(true);
    try {
      const title = selectedQuestion ? selectedQuestion.title : fileName;
      if (savedProgramId) {
        await updateSavedProgram(savedProgramId, {
          title,
          file_name: fileName,
          code: practiceCode,
          sample_input: standardInput
        });
      } else {
        const res = await saveProgram({
          title,
          file_name: fileName,
          language,
          original_code: originalCode,
          code: practiceCode,
          sample_input: standardInput,
          question_id: selectedQuestion ? selectedQuestion.id : null
        });
        if (res.program) {
          setSavedProgramId(res.program.id);
        }
      }
      setSaveSuccessMsg('Program saved successfully to My Practice!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      alert('Failed to save program. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCopyCode = () => {
    const currentCode = activeCodeMode === 'practice' ? practiceCode : originalCode;
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Question Selector & Active File Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Practice Question Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Practice Task:</span>
          </div>

          <select
            value={selectedQuestion ? selectedQuestion.id : ''}
            onChange={(e) => {
              const q = questions.find(item => item.id === parseInt(e.target.value));
              if (q) loadQuestion(q);
            }}
            className="text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Custom Practice (Free Code)</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.difficulty} • {q.language})
              </option>
            ))}
          </select>
        </div>

        {/* Editable File Name & Language Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* File Name with Edit & Validation */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <FileCode className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-500">File Name:</span>
            {isEditingFileName ? (
              <input
                type="text"
                value={fileName}
                onChange={(e) => {
                  // Sanitize filename against invalid characters
                  const sanitized = e.target.value.replace(/[\\/:*?"<>|\s]/g, '_');
                  setFileName(sanitized);
                }}
                onBlur={() => {
                  if (!fileName.trim()) {
                    setFileName(`Untitled.${LANGUAGE_EXTENSIONS[language] || 'py'}`);
                  }
                  setIsEditingFileName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingFileName(false);
                  }
                }}
                autoFocus
                className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-400 focus:outline-none"
              />
            ) : (
              <button 
                onClick={() => setIsEditingFileName(true)}
                className="text-xs font-mono font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-slate-200/60 transition"
                title="Click to rename file"
              >
                <span>[{fileName}]</span>
                <Edit3 className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>

          {/* Language Dropdown */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {PROGRAMMING_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* If Question is selected, show Question Description Card */}
      {selectedQuestion && (
        <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h2 className="text-base font-black text-blue-950 flex items-center gap-2">
              <span>{selectedQuestion.title}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-200 text-blue-900">
                {selectedQuestion.category}
              </span>
            </h2>
            <div className="text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
              Difficulty: {selectedQuestion.difficulty}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            {selectedQuestion.description}
          </p>
        </div>
      )}

      {/* Main Workspace: Left Code Editor (7 cols) & Right Input/Output Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Code Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Editor Control Bar: Mode Toggle & Utilities */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            
            {/* Mode Switcher: Practice vs Original Code */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveCodeMode('practice')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeCodeMode === 'practice'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Practice Code
              </button>
              <button
                onClick={() => setActiveCodeMode('original')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeCodeMode === 'original'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View immutable original code"
              >
                Original Code
              </button>
            </div>

            {/* Quick Actions (Copy, Reset) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleResetCode}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
                title="Reset practice code to original"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="h-[460px] relative bg-slate-950">
            <Editor
              height="100%"
              language={language === 'csharp' ? 'csharp' : language}
              theme="vs-dark"
              value={activeCodeMode === 'practice' ? practiceCode : originalCode}
              onChange={(val) => {
                if (activeCodeMode === 'practice') {
                  setPracticeCode(val || '');
                }
              }}
              options={{
                readOnly: activeCodeMode === 'original',
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: 'always',
                formatOnPaste: true,
                wordWrap: 'on'
              }}
            />
          </div>

          {/* Action Bar Below Editor */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Primary: Run Practice Code */}
              <button
                onClick={() => handleRunCode(practiceCode, 'practice')}
                disabled={executing}
                className="inline-flex items-center px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 transition gap-2"
              >
                {executing ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>▶ Run Code</span>
              </button>

              {/* Run Original Code */}
              <button
                onClick={handleRunOriginalCode}
                disabled={executing}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 disabled:opacity-50 transition gap-1.5"
                title="Runs the original unchanged program"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Run Original Code</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Analyze Code Button */}
              <button
                onClick={handleAnalyzeCode}
                disabled={analyzing}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 transition gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{analyzing ? 'Analyzing...' : 'Analyze Code'}</span>
              </button>

              {/* Save Program Button */}
              <button
                onClick={handleSaveProgram}
                disabled={saveLoading}
                className="inline-flex items-center px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saveLoading ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-emerald-800 text-xs font-bold text-center">
              ✓ {saveSuccessMsg}
            </div>
          )}
        </div>

        {/* Right: Input & Output Execution Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Box 1: Input Panel (stdin) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Input
                </span>
              </div>
              <button
                onClick={() => setStandardInput('')}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition"
              >
                [Clear Input]
              </button>
            </div>

            <div className="p-3 bg-slate-50/50">
              <textarea
                value={standardInput}
                onChange={(e) => setStandardInput(e.target.value)}
                placeholder="Enter input values one per line. Example:&#10;5&#10;10"
                rows={4}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 font-mono text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
              />
              <p className="text-[11px] text-slate-500 mt-1 pl-1">
                Each line is passed into your program's input stream.
              </p>
            </div>
          </div>

          {/* Box 2: Output Panel (stdout & runtime) */}
          <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-md overflow-hidden flex flex-col font-mono text-xs">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-300 font-sans">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Output</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExecState({ output: '', error: '', friendly_error: null, status: '', execution_time_ms: 0.0, executed: false })}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                >
                  [Clear Output]
                </button>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  execState.status === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  execState.status === 'compilation_error' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  execState.status === 'runtime_error' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                  execState.status === 'timeout' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {execState.status || 'Ready'}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3 min-h-[190px] max-h-[340px] overflow-y-auto">
              
              {executing && (
                <div className="flex items-center gap-2 text-blue-400 text-xs py-4 font-sans">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>⏳ Running your code...</span>
                </div>
              )}

              {/* Stdout Stream */}
              {execState.output ? (
                <div>
                  <div className="text-emerald-500 font-bold mb-1 text-[11px] font-sans">Program Output:</div>
                  <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed font-mono">
                    {execState.output}
                  </pre>
                </div>
              ) : null}

              {/* Beginner-Friendly Error Presentation */}
              {execState.error ? (
                <div className="p-3.5 bg-rose-950/70 border border-rose-800/90 rounded-2xl space-y-2.5 font-sans">
                  {execState.friendly_error ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-rose-400 font-bold flex items-center gap-1.5 text-sm">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{execState.friendly_error.title || '❌ Execution Error'}</span>
                      </div>
                      
                      <p className="text-rose-200 font-medium leading-relaxed">
                        {execState.friendly_error.message}
                      </p>

                      {execState.friendly_error.possible_reason && (
                        <div className="bg-rose-900/40 p-2.5 rounded-xl border border-rose-800/60 text-[11px] text-rose-200 space-y-1">
                          <span className="font-bold text-rose-300 block uppercase tracking-wider text-[10px]">
                            Possible reason:
                          </span>
                          <span>{execState.friendly_error.possible_reason}</span>
                        </div>
                      )}

                      {execState.friendly_error.line_hint && (
                        <div className="text-[11px] text-rose-300 font-bold">
                          💡 {execState.friendly_error.line_hint}
                        </div>
                      )}

                      {execState.friendly_error.suggestion && (
                        <div className="text-[11px] text-amber-200">
                          <strong>Fix tip:</strong> {execState.friendly_error.suggestion}
                        </div>
                      )}

                      {/* Raw Compiler Error */}
                      <details className="pt-2 border-t border-rose-800/50 text-[10px]">
                        <summary className="text-rose-400 cursor-pointer hover:underline font-mono">
                          View original compiler error trace
                        </summary>
                        <pre className="mt-1.5 p-2 bg-slate-950 rounded-lg text-rose-300 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                          {execState.error}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <div>
                      <div className="text-rose-400 font-bold text-xs flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>❌ Execution Failed</span>
                      </div>
                      <pre className="text-rose-200 whitespace-pre-wrap text-[11px] font-mono leading-relaxed mt-1">
                        {execState.error}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}

              {!executing && !execState.output && !execState.error && (
                <div className="text-slate-500 text-center py-10 font-sans text-xs">
                  Click <strong className="text-blue-400">▶ Run Code</strong> to execute and see program output.
                </div>
              )}
            </div>

            {/* Execution Metadata Bar */}
            {execState.executed && (
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span>
                  {execState.status === 'success' ? '✓ Code executed successfully' : '✕ Execution failed - Please check the error above'}
                </span>
                <span>
                  Status: <strong className="text-slate-200 uppercase">{execState.status}</strong> • Time: <strong className="text-slate-200">{execState.execution_time_ms} ms</strong>
                </span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Analysis & Beginner-Friendly Explanation Modal */}
      {analysisModalOpen && analysisResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 space-y-0">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-purple-200" />
                <div>
                  <h3 className="text-lg font-black">Code Analysis & Beginner Tutor Report</h3>
                  <p className="text-xs text-purple-100">Simple English explanation of your code logic and performance.</p>
                </div>
              </div>
              <button
                onClick={() => setAnalysisModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Metric Counters Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Language</div>
                  <div className="text-xs font-black text-slate-800 capitalize mt-1">{analysisResult.language || language}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Lines</div>
                  <div className="text-base font-black text-slate-800">{analysisResult.lines_of_code}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Functions</div>
                  <div className="text-base font-black text-blue-600">{analysisResult.functions_count}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Variables</div>
                  <div className="text-base font-black text-emerald-600">{analysisResult.variables_count}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Loops</div>
                  <div className="text-base font-black text-amber-600">{analysisResult.loops_count}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Conditions</div>
                  <div className="text-base font-black text-purple-700">{analysisResult.conditions_count}</div>
                </div>
              </div>

              {/* Complexity Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5">
                  <div className="text-[10px] font-bold text-purple-900 uppercase">Time Complexity</div>
                  <div className="text-lg font-black text-purple-700">{analysisResult.time_complexity}</div>
                  <p className="text-[11px] text-purple-900/80 mt-0.5">How execution time grows with input size.</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5">
                  <div className="text-[10px] font-bold text-indigo-900 uppercase">Space Complexity</div>
                  <div className="text-lg font-black text-indigo-700">{analysisResult.space_complexity}</div>
                  <p className="text-[11px] text-indigo-900/80 mt-0.5">How much computer memory the program requires.</p>
                </div>
              </div>

              {/* What does this program do? */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-1">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" /> What does this program do?
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {analysisResult.summary_what_it_does}
                </p>
              </div>

              {/* Step-by-Step Logic Summary */}
              {analysisResult.step_by_step_summary && analysisResult.step_by_step_summary.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Step-by-Step Overview:
                  </h4>
                  <div className="space-y-1.5">
                    {analysisResult.step_by_step_summary.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-medium pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables breakdown */}
              {analysisResult.variables_breakdown && analysisResult.variables_breakdown.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Variables Used:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysisResult.variables_breakdown.map((v, idx) => (
                      <div key={idx} className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-medium">
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Line-by-Line Breakdown */}
              {analysisResult.line_by_line_explanations && analysisResult.line_by_line_explanations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Important Lines Explained:
                  </h4>
                  <div className="space-y-2">
                    {analysisResult.line_by_line_explanations.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-600">
                          <span>Line {item.line_number}: <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{item.code}</code></span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {item.simple_explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Beginner Tips & Suggestions */}
              {analysisResult.beginner_tips && analysisResult.beginner_tips.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Beginner Tips & Suggestions:
                  </h4>
                  <ul className="list-disc pl-4 text-xs text-emerald-950 space-y-1 font-medium">
                    {analysisResult.beginner_tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setAnalysisModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

