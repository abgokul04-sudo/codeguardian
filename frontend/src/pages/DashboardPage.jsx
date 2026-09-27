import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQuestions, getSavedPrograms, getPracticeHistory } from '../services/api';
import { 
  Code, BookOpen, BookmarkCheck, Play, CheckCircle2, 
  Clock, ArrowRight, Sparkles, Trophy, Flame, ChevronRight, FileCode
} from 'lucide-react';

export default function DashboardPage() {
  const { user, stats, refreshProfile } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [recentSaved, setRecentSaved] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshProfile();
    const loadData = async () => {
      try {
        const [qRes, sRes, hRes] = await Promise.allSettled([
          getQuestions(),
          getSavedPrograms(),
          getPracticeHistory()
        ]);

        if (qRes.status === 'fulfilled' && qRes.value.questions) {
          setQuestions(qRes.value.questions);
        }
        if (sRes.status === 'fulfilled' && sRes.value.programs) {
          setRecentSaved(sRes.value.programs.slice(0, 4));
        }
        if (hRes.status === 'fulfilled' && hRes.value.history) {
          setRecentHistory(hRes.value.history.slice(0, 5));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Code Practice Platform</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Welcome, {user?.username || 'Coder'}! 👋
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Practice coding challenges with instant execution, test with custom input, inspect Python Tutor-style memory frames, and analyze your logic with simple beginner explanations.
          </p>
          
          <div className="pt-3 flex flex-wrap gap-3">
            <Link
              to="/practice"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Code Practice</span>
            </Link>
            <Link
              to="/review"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm shadow-md transition gap-2"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              <span>AI Code Reviewer</span>
            </Link>
          </div>
        </div>

        {/* Decorative Background Accents */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
      </div>

      {/* Practice Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions</div>
            <div className="text-2xl font-black text-slate-900">{stats?.attempted_questions || 0}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Successful Runs</div>
            <div className="text-2xl font-black text-emerald-700">{stats?.successful_runs || 0}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saved Programs</div>
            <div className="text-2xl font-black text-purple-700">{stats?.saved_programs || recentSaved.length}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Executions</div>
            <div className="text-2xl font-black text-amber-700">{stats?.executions_total || recentHistory.length}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Practice Questions & Saved Programs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Practice Question Bank (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Practice Challenges</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a beginner-friendly question to solve, run, and analyze in the live code editor.
              </p>
            </div>
            <Link to="/practice" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {questions.map((q) => (
              <div 
                key={q.id}
                className="p-4 rounded-2xl border border-slate-200/90 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 transition group flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                      {q.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                      q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      {q.language}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {q.description}
                  </p>
                </div>

                <Link
                  to={`/practice?questionId=${q.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-white group-hover:bg-blue-600 border border-slate-300 group-hover:border-blue-600 text-slate-700 group-hover:text-white font-bold text-xs shadow-xs transition shrink-0 flex items-center gap-1"
                >
                  <span>Solve</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Saved Programs & Execution History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Saved Programs Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BookmarkCheck className="w-4 h-4 text-purple-600" />
                <span>My Saved Programs</span>
              </h3>
              <Link to="/saved" className="text-xs font-bold text-purple-600 hover:text-purple-700">
                View All
              </Link>
            </div>

            {recentSaved.length > 0 ? (
              <div className="space-y-2.5">
                {recentSaved.map((p) => (
                  <Link
                    key={p.id}
                    to={`/practice?savedId=${p.id}`}
                    className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50/60 hover:bg-purple-50/30 flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-3">
                      <FileCode className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.file_name} • {p.language}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs space-y-2">
                <BookmarkCheck className="w-8 h-8 mx-auto text-slate-300" />
                <p>No saved programs yet. Save your practice solutions to access them anytime!</p>
              </div>
            )}
          </div>

          {/* Quick Practice History Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Recent Practice Activity</span>
              </h3>
              <Link to="/history" className="text-xs font-bold text-amber-600 hover:text-amber-700">
                Full Log
              </Link>
            </div>

            {recentHistory.length > 0 ? (
              <div className="space-y-2">
                {recentHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{h.question_name}</div>
                      <div className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleDateString()} • {h.language}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      h.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {h.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                Your execution and practice history will appear here.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
