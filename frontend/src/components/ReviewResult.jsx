import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertCircle, AlertTriangle, CheckCircle, Info, Copy, 
  Terminal, ArrowRight, ArrowDown, Bot, Send, User, Sparkles, Check, 
  Play, Loader2, Download, FileText, ChevronRight, ChevronLeft,
  GitCommit, RefreshCw, Layers, ArrowRightCircle, CheckSquare, Eye, Globe
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import MemoryVisualizer from './MemoryVisualizer';
import { generateReviewPDF } from '../services/pdfGenerator';
import { chatWithBot, executeCode, translateCode } from '../services/api';

const LANGUAGE_LABELS = {
  en: 'English 🇬🇧',
  ta: 'Tamil (தமிழ்) 🇮🇳',
  te: 'Telugu (తెలుగు) 🇮🇳',
  hi: 'Hindi (हिन्दी) 🇮🇳',
  ml: 'Malayalam (മലയാളം) 🇮🇳'
};

const TRANSLATION_TARGET_LANGUAGES = [
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

export default function ReviewResult({ result, language, code, explanationLanguage, standardInput: initialStandardInput = '' }) {
  const [copied, setCopied] = useState(false);
  const [translatedCopied, setTranslatedCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  
  // Translation state
  const [targetLang, setTargetLang] = useState(language === 'python' ? 'javascript' : 'python');
  const [translatedData, setTranslatedData] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  // Prefer improved execution output if it succeeded, or original execution
  const initialExecution = (result.execution?.improved_execution && result.execution.improved_execution.status === 'success')
    ? result.execution.improved_execution
    : (result.execution || {});

  // Execution re-run state (re-runs do not repeat stale initial execution errors)
  const [execState, setExecState] = useState(initialExecution);
  const [executing, setExecuting] = useState(false);
  const [executingMode, setExecutingMode] = useState(result.execution?.improved_execution?.status === 'success' ? 'improved' : 'original');
  const [standardInput, setStandardInput] = useState(initialStandardInput);

  // Flowchart walkthrough navigation state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [flowchartViewMode, setFlowchartViewMode] = useState('interactive'); // 'interactive' | 'full'

  // Chatbot states
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: getGreeting(explanationLanguage)
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const reportRef = useRef(null);

  useEffect(() => {
    const updatedExec = (result.execution?.improved_execution && result.execution.improved_execution.status === 'success')
      ? result.execution.improved_execution
      : (result.execution || {});
    setExecState(updatedExec);
    setExecutingMode(result.execution?.improved_execution?.status === 'success' ? 'improved' : 'original');
    setCurrentStepIndex(0);
    setStandardInput(initialStandardInput);
    setMessages([
      {
        role: 'model',
        content: getGreeting(explanationLanguage)
      }
    ]);
  }, [result, explanationLanguage, initialStandardInput]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  function getGreeting(lang) {
    switch (lang) {
      case 'ta':
        return 'வணக்கம்! இந்த குறியீடு (code) அல்லது அதில் உள்ள பிழைகள் பற்றி ஏதேனும் கேள்விகள் இருந்தால் கேளுங்கள். நான் உங்களுக்கு எளிய தமிழில் விளக்குகிறேன்.';
      case 'te':
        return 'నమస్కారం! ఈ కోడ్ లేదా లోపాల గురించి మీకు ఏవైనా ప్రశ్నలు ఉంటే అడగండి. నేను మీకు సులభమైన తెలుగులో వివరిస్తాను.';
      case 'hi':
        return 'नमस्ते! इस कोड या इसमें पाई गई त्रुटियों के बारे में यदि आपका कोई प्रश्न है, तो बेझिझक पूछें। मैं आपको सरल हिन्दी में समझाऊँगा।';
      case 'ml':
        return 'നമസ്കാരം! ഈ കോഡിനെക്കുറിച്ചോ അതിലെ തെറ്റുകളെക്കുറിച്ചോ എന്തെങ്കിലും സംശയങ്ങൾ ഉണ്ടെങ്കിൽ ചോദിക്കാം. ഞാൻ ലളിതമായ മലയാളത്തിൽ വിശദീകരിക്കാം.';
      default:
        return 'Hello! I am your AI Code Tutor. Feel free to ask any question about the errors, logic, functions, variables, or execution of this code!';
    }
  }

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTranslatedCode = (text) => {
    navigator.clipboard.writeText(text);
    setTranslatedCopied(true);
    setTimeout(() => setTranslatedCopied(false), 2000);
  };

  const handleTranslateCode = async () => {
    setTranslating(true);
    setTranslationError(null);
    try {
      const codeToTranslate = result.improved_code || code;
      const res = await translateCode(codeToTranslate, targetLang, language, explanationLanguage);
      if (res && res.success && res.translation) {
        setTranslatedData(res.translation);
      } else {
        setTranslationError(res?.error || 'Failed to translate code.');
      }
    } catch (err) {
      console.error(err);
      setTranslationError('Connection error while translating code.');
    } finally {
      setTranslating(false);
    }
  };

  // Re-run execution (executes code freshly and completely clears previous timeout/error states)
  const handleReExecute = async (codeToRun, mode = 'improved') => {
    setExecuting(true);
    setExecutingMode(mode);
    // Clear out prior output/error during active execution
    setExecState({ status: 'running...', output: '', error: '', executed: true });
    try {
      const res = await executeCode(language, codeToRun, standardInput);
      if (res && res.success && res.result) {
        // Explicitly set the new execution result
        setExecState({
          executed: res.result.executed ?? true,
          status: res.result.status || (res.result.error ? 'runtime_error' : 'success'),
          output: res.result.output || '',
          error: res.result.error || '',
          returncode: res.result.returncode
        });
      } else {
        setExecState({
          executed: false,
          status: 'error',
          output: '',
          error: res?.error || 'Failed to execute code.'
        });
      }
    } catch (e) {
      console.error(e);
      setExecState({
        executed: false,
        status: 'error',
        output: '',
        error: 'Execution failed: unable to connect to backend server.'
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userText = inputMessage.trim();
    const updatedMessages = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setInputMessage('');
    setChatLoading(true);

    try {
      const res = await chatWithBot(
        updatedMessages,
        code,
        language,
        explanationLanguage,
        {
          errors_found: result.errors_found,
          improved_code: result.improved_code,
          explanation: result.explanation
        }
      );
      if (res.success) {
        setMessages([...updatedMessages, { role: 'model', content: res.response }]);
      } else {
        setMessages([...updatedMessages, { role: 'model', content: 'Failed to get answer. Please try again.' }]);
      }
    } catch (err) {
      setMessages([...updatedMessages, { role: 'model', content: 'Connection error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // PDF Generation: Clean vector PDF with jsPDF & html2pdf containing all sections
  const handleDownloadPDF = async () => {
    setPdfGenerating(true);
    try {
      await generateReviewPDF({
        result,
        language,
        code,
        explanationLanguage,
        execState,
        languageLabels: LANGUAGE_LABELS,
        reportElement: reportRef.current
      });
    } catch (err) {
      console.error('PDF generation error, opening browser print:', err);
      window.print();
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadMarkdown = () => {
    let md = `# CodeGuardian - AI Programming Tutor & Code Review Report\n\n`;
    md += `**Programming Language**: ${language}\n`;
    md += `**Explanation Language**: ${LANGUAGE_LABELS[explanationLanguage] || explanationLanguage}\n\n`;

    md += `## 1. Errors & Issues Found\n`;
    if (result.errors_found && result.errors_found.length > 0) {
      result.errors_found.forEach((err, idx) => {
        md += `### Issue #${idx + 1} (Line ${err.line})\n`;
        md += `- **Problem**: ${err.problem}\n`;
        md += `- **Why it happens**: ${err.why_it_happens}\n`;
        md += `- **Suggested fix**: ${err.suggested_fix}\n\n`;
      });
    } else {
      md += `No errors found! Great work.\n\n`;
    }

    if (result.potential_problems && result.potential_problems.length > 0) {
      md += `## Potential Problems & Edge Cases\n`;
      result.potential_problems.forEach((prob, idx) => {
        md += `- Line ${prob.line}: ${prob.problem} (${prob.suggested_fix})\n`;
      });
      md += `\n`;
    }

    md += `## 2. What Was Implemented\n`;
    if (result.implemented_fixes && result.implemented_fixes.length > 0) {
      result.implemented_fixes.forEach((fix) => {
        md += `- Line ${fix.line}: ${fix.fix_description}\n`;
      });
    } else {
      md += `- Preserved original structure with zero modifications needed.\n`;
    }
    md += `\n`;

    md += `## 3. Execution Result\n`;
    md += `Status: ${execState.status || 'Not Executed'}\n\n`;
    if (execState.output) {
      md += `Output:\n\`\`\`\n${execState.output}\n\`\`\`\n\n`;
    }
    if (execState.error) {
      md += `Errors / Stderr:\n\`\`\`\n${execState.error}\n\`\`\`\n\n`;
    }

    md += `## 4. Improved Code (Minimal Changes Only)\n`;
    md += `\`\`\`${language}\n${result.improved_code}\n\`\`\`\n\n`;

    md += `## 5. Visual Step-by-Step Flowchart\n`;
    if (result.walkthrough && result.walkthrough.length > 0) {
      result.walkthrough.forEach(step => {
        md += `**Step ${step.step_number} [${step.phase}]**: \`${step.code_snippet}\`\n`;
        if (step.condition) md += `- *Condition Checked*: \`${step.condition}\`\n`;
        if (step.branch_true) md += `- *If True*: ${step.branch_true}\n`;
        if (step.branch_false) md += `- *If False*: ${step.branch_false}\n`;
        if (step.next_step) md += `- *Next Flow*: ${step.next_step}\n`;
        md += `- *Explanation*: ${step.explanation}\n`;
        md += `- *State*: ${step.state_changes}\n\n`;
      });
    }

    md += `## 6. General Explanation\n${result.explanation}\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codeguardian-review-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorsCount = (result.errors_found || []).length;
  const potentialCount = (result.potential_problems || []).length;
  const correctCount = (result.correct_parts || []).length;
  const suggestionsCount = (result.suggestions || []).length;

  const walkthroughSteps = result.walkthrough || [];
  const activeStep = walkthroughSteps[currentStepIndex] || null;

  return (
    <div className="flex flex-col bg-white text-gray-900 divide-y divide-gray-200">
      
      {/* 1. Header & Actionable Summary Cards (Score Removed) */}
      <div className="p-6 bg-slate-900 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Code Review & Tutor Report</h2>
              <p className="text-xs text-slate-300">
                Language: <span className="font-semibold text-blue-400 uppercase">{language}</span> • Explanations in: <span className="font-semibold text-emerald-400">{LANGUAGE_LABELS[explanationLanguage]}</span>
              </p>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfGenerating}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 transition"
              title="Download Full Report as PDF format"
            >
              {pdfGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
              Download PDF
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Download Report as Markdown"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Markdown
            </button>
          </div>
        </div>

        {/* Actionable Feedback Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Correct Parts</div>
              <div className="text-lg font-bold text-emerald-400">{correctCount}</div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-rose-500/30 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Errors Found</div>
              <div className="text-lg font-bold text-rose-400">{errorsCount}</div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Potential Issues</div>
              <div className="text-lg font-bold text-amber-400">{potentialCount}</div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Suggestions</div>
              <div className="text-lg font-bold text-cyan-400">{suggestionsCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Wrapper for PDF export */}
      <div ref={reportRef} className="p-6 space-y-6">

        {/* SECTION 1: Errors Found + Multilingual Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">1</span>
              Errors & Issues Found
            </h3>
            <span className="text-xs text-gray-500">Exact Line & Multilingual Suggestions</span>
          </div>

          {errorsCount === 0 && potentialCount === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-medium">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>No errors or bugs detected in this code! Clean and well written.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {result.errors_found?.map((err, idx) => (
                <div key={idx} className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 transition hover:shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Issue #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                      Line: {err.line}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold text-gray-900">Problem: </span>
                      <span className="text-gray-800">{err.problem}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">Why it happens: </span>
                      <span className="text-gray-700">{err.why_it_happens}</span>
                    </div>
                    <div className="pt-1 bg-white/80 p-2.5 rounded-lg border border-rose-100">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1 text-xs uppercase tracking-wide mb-1">
                        <Check className="w-3.5 h-3.5" /> Suggested Fix:
                      </span>
                      <span className="text-gray-800 font-medium">{err.suggested_fix}</span>
                    </div>
                  </div>
                </div>
              ))}

              {result.potential_problems?.map((prob, idx) => (
                <div key={`prob-${idx}`} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Potential Problem #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      Line: {prob.line}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mb-1"><strong>Problem:</strong> {prob.problem}</p>
                  <p className="text-sm text-gray-700"><strong>Recommendation:</strong> {prob.suggested_fix}</p>
                </div>
              ))}
            </div>
          )}

          {result.correct_parts && result.correct_parts.length > 0 && (
            <div className="mt-4 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Correct & Well Implemented Parts:
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-emerald-950">
                {result.correct_parts.map((cp, idx) => (
                  <li key={idx}>{cp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* SECTION 2: What Was Implemented */}
        <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200 space-y-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">2</span>
            What Was Implemented
          </h3>
          
          {result.implemented_fixes && result.implemented_fixes.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-3 divide-y divide-gray-100">
              {result.implemented_fixes.map((fix, idx) => (
                <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start gap-3">
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded shrink-0">
                    Line {fix.line}
                  </span>
                  <span className="text-sm text-gray-800 font-medium">{fix.fix_description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
              No modifications were required. Original logic intact.
            </div>
          )}
        </div>

        {/* SECTION 3: Execution Result & Output */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">3</span>
                Execution Result
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Comparison of actual runtime execution: Original Code vs Improved Fixed Code.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReExecute(result.improved_code || code, 'improved')}
                disabled={executing}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 transition"
                title="Re-run the improved fixed code"
              >
                {executing && executingMode === 'improved' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />}
                Re-Run Improved Code
              </button>
              <button
                onClick={() => handleReExecute(code, 'original')}
                disabled={executing}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 disabled:opacity-50 transition"
                title="Re-run original code"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${executing && executingMode === 'original' ? 'animate-spin' : ''}`} />
                Re-Run Original
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <label htmlFor="rerun-program-input" className="block text-xs font-semibold text-indigo-950 mb-1.5">
              Input for re-run (stdin)
            </label>
            <textarea
              id="rerun-program-input"
              value={standardInput}
              onChange={(e) => setStandardInput(e.target.value)}
              rows={3}
              placeholder={'Enter one value per line. Example:\nJaya\n25'}
              className="w-full resize-y rounded-lg border border-indigo-200 bg-white px-3 py-2 font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-indigo-800">Update these values, then choose either re-run button. The values are sent exactly as program standard input.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: Original Code Execution */}
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs shadow-inner flex flex-col">
              <div className="bg-slate-900 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold text-slate-200">Original Code Execution</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  (result.execution?.status === 'success') ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  (result.execution?.status === 'timeout') ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-rose-950 text-rose-400 border border-rose-800'
                }`}>
                  {result.execution?.status || 'Error'}
                </span>
              </div>

              <div className="p-3.5 space-y-2 flex-1 max-h-48 overflow-y-auto">
                {result.execution?.output && (
                  <div>
                    <div className="text-slate-500 mb-0.5 text-[10px] uppercase font-sans font-semibold">Stdout:</div>
                    <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed">{result.execution.output}</pre>
                  </div>
                )}

                {result.execution?.error && result.execution?.status !== 'timeout' && (
                  <div>
                    <div className="text-rose-400 mb-0.5 text-[10px] uppercase font-sans font-bold">
                      Runtime Error / Stderr:
                    </div>
                    <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">
                      {result.execution.error}
                    </pre>
                  </div>
                )}

                {!result.execution?.output && (!result.execution?.error || result.execution?.status === 'timeout') && (
                  <div className="text-slate-400 italic">Program execution completed successfully.</div>
                )}
              </div>
            </div>

            {/* Box 2: Improved Fixed Code Execution */}
            <div className="rounded-xl overflow-hidden border border-emerald-900/60 bg-slate-950 font-mono text-xs shadow-inner flex flex-col">
              <div className="bg-emerald-950/40 px-3.5 py-2.5 flex items-center justify-between border-b border-emerald-900/50 text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-emerald-200">Fixed Code Output (Clean)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  (execState.status === 'success' || result.execution?.improved_execution?.status === 'success')
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {execState.status === 'running...' ? 'Running...' : (execState.status || result.execution?.improved_execution?.status || 'Verified')}
                </span>
              </div>

              <div className="p-3.5 space-y-2 flex-1 max-h-48 overflow-y-auto">
                {execState.status === 'running...' && (
                  <div className="flex items-center gap-2 text-blue-400 text-xs py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing fixed code freshly...</span>
                  </div>
                )}

                {/* Show stdout of improved code */}
                {(execState.output || result.execution?.improved_execution?.output) ? (
                  <div>
                    <div className="text-emerald-500 mb-0.5 text-[10px] uppercase font-sans font-bold">Output (stdout):</div>
                    <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed font-semibold">
                      {execState.output || result.execution?.improved_execution?.output}
                    </pre>
                  </div>
                ) : (execState.status !== 'running...' && !execState.error && !result.execution?.improved_execution?.error) ? (
                  <div className="text-emerald-400/80 italic">
                    {result.execution?.simulated_output || 'Fixed code executes cleanly without runtime errors or infinite loops.'}
                  </div>
                ) : null}

                {/* If improved code produced an error on custom re-run */}
                {execState.error && execState.status !== 'running...' && (
                  <div>
                    <div className="text-rose-400 mb-0.5 text-[10px] uppercase font-sans font-bold">Error:</div>
                    <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed">{execState.error}</pre>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 4: Improved Code (Minimal Changes Only) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">4</span>
                Improved Code (Minimal Changes Only)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Preserved original structure, variable names, and style with minimal required corrections.
              </p>
            </div>
            <button
              onClick={() => handleCopyCode(result.improved_code)}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-gray-300 shadow-sm text-gray-700 hover:bg-gray-50 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
            <Editor
              height="260px"
              language={language}
              theme="vs-dark"
              value={result.improved_code || code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>

        {/* SECTION 5: Visual Step-by-Step Flowchart with Preview/Next Flow */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">5</span>
                Visual Flowchart & Execution Tracer
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Interactive flow: Next loop destination, condition checks, and direction arrows.
              </p>
            </div>

            {walkthroughSteps.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFlowchartViewMode(flowchartViewMode === 'interactive' ? 'full' : 'interactive')}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  {flowchartViewMode === 'interactive' ? 'View Full Diagram' : 'Interactive Stepper'}
                </button>
              </div>
            )}
          </div>

          {walkthroughSteps.length > 0 ? (
            <div>
              {/* Interactive Step-by-Step Stepper (Prev / Next) */}
              {flowchartViewMode === 'interactive' && activeStep && (
                <div className="border-2 border-purple-300 bg-gradient-to-br from-purple-50/70 to-indigo-50/50 rounded-2xl p-5 shadow-sm space-y-4">
                  {/* Step Progress Indicators */}
                  <div className="flex items-center justify-between border-b border-purple-200/80 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-purple-600 text-white font-bold text-xs rounded-lg shadow-sm">
                        Step {currentStepIndex + 1} of {walkthroughSteps.length}
                      </span>
                      <span className="px-2.5 py-0.5 bg-purple-200/80 text-purple-900 font-bold text-xs uppercase rounded-md">
                        {activeStep.phase}
                      </span>
                      {activeStep.condition && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-mono text-xs font-bold rounded-md flex items-center gap-1">
                          🔍 Check: {activeStep.condition}
                        </span>
                      )}
                    </div>

                    {/* Step Navigation Controls (Prev / Next) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentStepIndex === 0}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-40 transition shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4 mr-0.5" /> Previous
                      </button>
                      <button
                        onClick={() => setCurrentStepIndex(prev => Math.min(walkthroughSteps.length - 1, prev + 1))}
                        disabled={currentStepIndex === walkthroughSteps.length - 1}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition shadow-sm"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Flow Node Card */}
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-5 shadow-sm space-y-4">
                    
                    {/* Header Action Banner */}
                    <div className="flex items-center justify-between bg-purple-50/80 px-4 py-2.5 rounded-xl border border-purple-100 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                          {currentStepIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                          Stage: {activeStep.phase || 'Execution Step'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-xs">
                        {currentStepIndex < walkthroughSteps.length - 1 ? `Proceeds to Step ${currentStepIndex + 2}` : 'Execution Finish'}
                      </span>
                    </div>

                    {/* Code Snippet Highlight */}
                    {activeStep.code_snippet && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> Active Line Statement:
                        </div>
                        <div className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner">
                          <code>{activeStep.code_snippet}</code>
                        </div>
                      </div>
                    )}

                    {/* Flowchart Direction & Branching Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl">
                        <div className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                          <ArrowRightCircle className="w-4 h-4 text-blue-600" /> Control Flow Direction:
                        </div>
                        <p className="text-xs text-blue-950 font-semibold">
                          {activeStep.next_step || (currentStepIndex < walkthroughSteps.length - 1 ? `Moves directly to Step ${currentStepIndex + 2}` : 'Program finishes execution.')}
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                        <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-emerald-600" /> Memory / Variable State:
                        </div>
                        <p className="text-xs font-mono text-slate-800 font-bold break-all bg-white px-2.5 py-1 rounded border border-slate-200">
                          {activeStep.state_changes || 'Variables initialized'}
                        </p>
                      </div>
                    </div>

                    {/* Branch Decisions if Condition Exists */}
                    {(activeStep.branch_true || activeStep.branch_false || activeStep.condition) && (
                      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <span>🔍 Condition Check:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-950 font-bold">
                            {activeStep.condition || 'Evaluation'}
                          </span>
                        </div>
                        {activeStep.branch_true && <div className="text-emerald-800 pl-2">✅ <strong>If True:</strong> {activeStep.branch_true}</div>}
                        {activeStep.branch_false && <div className="text-rose-800 pl-2">❌ <strong>If False:</strong> {activeStep.branch_false}</div>}
                      </div>
                    )}

                    {/* Memory Visualizer (Frames & Objects) */}
                    <div className="pt-1">
                      <MemoryVisualizer 
                        frames={activeStep.frames} 
                        objects={activeStep.objects} 
                      />
                    </div>

                    {/* Localized Tutor Explanation Box */}
                    <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-purple-600" /> Tutor Explanation ({LANGUAGE_LABELS[explanationLanguage]}):
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                        {activeStep.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Flow Diagram Mini-Step Stepper Dots */}
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    {walkthroughSteps.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === currentStepIndex 
                            ? 'w-8 bg-purple-600' 
                            : 'w-2.5 bg-purple-200 hover:bg-purple-300'
                        }`}
                        title={`Step ${idx + 1}: ${s.phase}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Full Diagram View with Connected Arrows */}
              {flowchartViewMode === 'full' && (
                <div className="space-y-3 p-4 bg-slate-50 border border-purple-200 rounded-2xl">
                  {walkthroughSteps.map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="w-full bg-white border-2 border-purple-200 hover:border-purple-400 rounded-xl p-4 shadow-sm transition">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                          <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded bg-purple-100 text-purple-900">
                            Step {step.step_number || idx + 1}: {step.phase}
                          </span>
                          <span className="text-xs font-mono font-semibold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-purple-800">
                            {step.state_changes}
                          </span>
                        </div>

                        {step.code_snippet && (
                          <div className="mb-2 bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-xs">
                            <code>{step.code_snippet}</code>
                          </div>
                        )}

                        {step.condition && (
                          <div className="text-xs font-mono text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mb-2">
                            <strong>Condition Check:</strong> {step.condition}
                          </div>
                        )}

                        <p className="text-sm text-gray-800 font-medium">
                          {step.explanation}
                        </p>

                        {step.next_step && (
                          <div className="mt-2 text-xs font-semibold text-purple-700 flex items-center gap-1">
                            <ArrowRight className="w-3.5 h-3.5" /> Next: {step.next_step}
                          </div>
                        )}
                      </div>

                      {/* Direction Arrow between steps */}
                      {idx < walkthroughSteps.length - 1 && (
                        <div className="flex flex-col items-center py-2 text-purple-500">
                          <ArrowDown className="w-5 h-5 animate-bounce" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
              {result.explanation}
            </div>
          )}
        </div>

        {/* SECTION 6: Multi-Language Code Translator */}
        <div className="space-y-4 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">6</span>
                Multi-Language Code Translator
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Convert your code from <strong className="uppercase text-blue-600">{language}</strong> into another programming language idiomatically.
              </p>
            </div>

            {/* Target Language Select & Action Button */}
            <div className="flex items-center gap-2">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {TRANSLATION_TARGET_LANGUAGES.filter(l => l.value !== language).map(l => (
                  <option key={l.value} value={l.value}>Convert to {l.label}</option>
                ))}
              </select>

              <button
                onClick={handleTranslateCode}
                disabled={translating}
                className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-50 transition"
              >
                {translating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 mr-1.5" />}
                Translate Code
              </button>
            </div>
          </div>

          {translationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {translationError}
            </div>
          )}

          {translatedData && (
            <div className="border border-teal-200 bg-teal-50/30 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded bg-teal-100 text-teal-800">
                    Translated to {translatedData.target_language || targetLang}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyTranslatedCode(translatedData.translated_code)}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-teal-200 shadow-sm text-teal-800 hover:bg-teal-50 transition"
                >
                  {translatedCopied ? <Check className="w-3.5 h-3.5 mr-1 text-teal-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {translatedCopied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>

              {/* Monaco Editor for Translated Code */}
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <Editor
                  height="260px"
                  language={targetLang === 'csharp' ? 'csharp' : targetLang}
                  theme="vs-dark"
                  value={
                    typeof translatedData.translated_code === 'string'
                      ? translatedData.translated_code.replace(/\\n/g, '\n').replace(/\\t/g, '  ')
                      : ''
                  }
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>

              {/* Translation Explanation & Key Idiomatic Differences */}
              {translatedData.explanation && (
                <div className="p-3 bg-white border border-teal-100 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-teal-900">
                    Translation Notes ({LANGUAGE_LABELS[explanationLanguage]}):
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {translatedData.explanation}
                  </p>
                  {translatedData.key_differences && translatedData.key_differences.length > 0 && (
                    <div className="pt-1.5">
                      <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wide mb-1">
                        Key Language Differences:
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600">
                        {translatedData.key_differences.map((diff, i) => (
                          <li key={i}>{diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* SECTION 7: AI Explanation Chatbot */}
      <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-b-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                AI Programming Tutor Chatbot
              </h3>
              <p className="text-xs text-slate-400">
                Ask questions about errors, variables, logic, loops, or output in <span className="text-blue-400 font-semibold">{LANGUAGE_LABELS[explanationLanguage]}</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Code-Aware Context Active
          </span>
        </div>

        {/* Message Thread */}
        <div className="h-64 overflow-y-auto space-y-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] text-xs sm:text-sm p-3 rounded-2xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-slate-300 mt-1">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-2.5 items-center text-slate-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>AI Tutor is thinking in {LANGUAGE_LABELS[explanationLanguage]}...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask a question (e.g. "Where does the loop go next?") in ${LANGUAGE_LABELS[explanationLanguage]}...`}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || chatLoading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 transition"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>

    </div>
  );
}
