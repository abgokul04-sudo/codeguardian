import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { reviewCode } from '../services/api';
import ReviewResult from '../components/ReviewResult';
import { Loader2, Trash2, Play, Upload, Globe, Code, Sparkles, BookOpen } from 'lucide-react';

const PROGRAMMING_LANGUAGES = [
  { value: 'python', label: 'Python 🐍' },
  { value: 'javascript', label: 'JavaScript ⚡' },
  { value: 'java', label: 'Java ☕' },
  { value: 'cpp', label: 'C++ ⚙️' },
  { value: 'c', label: 'C 🔧' },
  { value: 'csharp', label: 'C# 🎯' },
  { value: 'typescript', label: 'TypeScript 📘' },
  { value: 'go', label: 'Go 🐹' },
  { value: 'php', label: 'PHP 🐘' },
];

const EXPLANATION_LANGUAGES = [
  { value: 'en', label: 'English 🇬🇧' },
  { value: 'ta', label: 'Tamil (தமிழ்) 🇮🇳' },
  { value: 'te', label: 'Telugu (తెలుగు) 🇮🇳' },
  { value: 'hi', label: 'Hindi (हिन्दी) 🇮🇳' },
  { value: 'ml', label: 'Malayalam (മലയാളം) 🇮🇳' },
];

const EXTENSION_MAP = {
  'js': 'javascript',
  'py': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'cc': 'cpp',
  'c': 'c',
  'cs': 'csharp',
  'ts': 'typescript',
  'go': 'go',
  'php': 'php',
};

const SAMPLE_CODES = {
  python: `name = "Jaya"\nprint(nam)`,
  javascript: `function calculateTotal(items) {\n  let total = 0;\n  for(let i=0; i <= items.length; i++) {\n    total += items[i].price;\n  }\n  return totl;\n}\n\ncalculateTotal([{ price: 10 }, { price: 20 }]);`,
  java: `public class Main {\n    public static void main(String[] args) {\n        int count = 10;\n        System.out.println(cont);\n    }\n}`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int num = 42;\n    cout << number << endl;\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    int sum = 100;\n    printf("Sum is: %d\\n", sam);\n    return 0;\n}`,
  csharp: `using System;\n\nclass Program {\n    static void Main() {\n        string user = "Jaya";\n        Console.WriteLine(usr);\n    }\n}`,
  typescript: `interface User {\n  name: string;\n  age: number;\n}\n\nconst person: User = {\n  name: "Jaya",\n  age: 25\n};\n\nconsole.log(person.nme);`,
  go: `package main\nimport "fmt"\n\nfunc main() {\n    msg := "Hello CodeGuardian"\n    fmt.Println(message)\n}`,
  php: `<?php\n$greeting = "Hello World";\necho $greting;\n?>`,
};

function ReviewPage() {
  const [code, setCode] = useState(SAMPLE_CODES.python);
  const [language, setLanguage] = useState('python');
  const [explanationLanguage, setExplanationLanguage] = useState('en');
  const [standardInput, setStandardInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!code || code === SAMPLE_CODES[language]) {
      setCode(SAMPLE_CODES[newLang] || '// Write or paste your code here\n');
    }
  };

  const handleReview = async () => {
    if (!code.trim()) {
      setError('Please enter or upload some code to review.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await reviewCode(language, code, explanationLanguage, standardInput);
      if (res.success) {
        setResult(res.review);
      } else {
        setError(res.error || 'Failed to complete review.');
      }
    } catch (err) {
      setError('Error connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setResult(null);
    setError(null);
  };

  const processFile = (file) => {
    if (!file) return;
    
    const parts = file.name.split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
    if (EXTENSION_MAP[ext]) {
      setLanguage(EXTENSION_MAP[ext]);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCode(e.target.result);
    };
    reader.readAsText(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* Left Column: Code Editor & Controls (5 cols on xl) */}
      <div className="xl:col-span-5 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
        
        {/* Top Control Bar */}
        <div className="p-4 border-b border-gray-200 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            
            {/* Programming Language Selector */}
            <div className="flex items-center gap-1.5">
              <Code className="w-4 h-4 text-blue-600 shrink-0" />
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="font-medium text-xs sm:text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {PROGRAMMING_LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Explanation Language Selector */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
              <select 
                value={explanationLanguage}
                onChange={(e) => setExplanationLanguage(e.target.value)}
                className="font-medium text-xs sm:text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-emerald-50 text-emerald-900 border-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                title="Select language for issue descriptions, explanations, and chatbot"
              >
                {EXPLANATION_LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/80">
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInput} 
                className="hidden" 
                accept=".js,.py,.java,.cpp,.cc,.c,.cs,.ts,.go,.php,.txt"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload
              </button>
              <button
                onClick={handleClear}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Clear
              </button>
            </div>

            <button
              onClick={handleReview}
              disabled={loading}
              className="inline-flex items-center px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Reviewing & Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  Review & Explain
                </>
              )}
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div 
          className={`h-[480px] xl:h-[600px] relative ${isDragging ? 'bg-blue-50' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-600/10 border-4 border-blue-500 border-dashed m-3 rounded-xl">
              <div className="text-xl font-bold text-blue-700 pointer-events-none">
                Drop your code file here!
              </div>
            </div>
          )}
          <Editor
            height="100%"
            language={language === 'csharp' ? 'csharp' : language}
            theme="vs-light"
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        <div className="border-t border-gray-200 bg-slate-50 p-4">
          <label htmlFor="program-input" className="mb-1.5 block text-xs font-semibold text-gray-700">
            Program input (stdin)
          </label>
          <textarea
            id="program-input"
            value={standardInput}
            onChange={(e) => setStandardInput(e.target.value)}
            rows={3}
            placeholder={'Enter one value per line. Example:\nJaya\n25'}
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">One line is supplied for each input request made by your program.</p>
        </div>
      </div>

      {/* Right Column: Review Report, Output, Walkthrough & AI Chat (7 cols on xl) */}
      <div className="xl:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {error && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[500px] text-gray-500 gap-4 p-8 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin flex items-center justify-center" />
              <Sparkles className="w-6 h-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">AI Programming Tutor is at work</h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Executing your code, analyzing bugs, preparing minimal fixes, generating the step-by-step walkthrough, and translating explanations into {EXPLANATION_LANGUAGES.find(l => l.value === explanationLanguage)?.label}...
              </p>
            </div>
          </div>
        ) : result ? (
          <ReviewResult 
            result={result} 
            language={language} 
            code={code} 
            explanationLanguage={explanationLanguage}
            standardInput={standardInput}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[520px] text-gray-400 p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-gray-200 flex items-center justify-center text-gray-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-800">Ready to Review & Teach</h3>
              <p className="text-xs text-gray-500 max-w-md">
                Select your programming language and preferred explanation language (English, Tamil, Telugu, Hindi, or Malayalam), then click <strong>Review & Explain</strong>.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              <span className="px-2.5 py-1 rounded-full bg-gray-100">Exact Line Issues</span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100">Execution Output</span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100">Minimal Fixes</span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100">Visual Flow</span>
              <span className="px-2.5 py-1 rounded-full bg-gray-100">AI Tutor Bot</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default ReviewPage;
