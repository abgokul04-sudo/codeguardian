import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSavedPrograms, deleteSavedProgram } from '../services/api';
import { BookmarkCheck, Search, Trash2, ArrowRight, Play, FileCode, Clock, Plus } from 'lucide-react';

export default function SavedProgramsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPrograms = async () => {
    try {
      const res = await getSavedPrograms();
      if (res && res.programs) {
        setPrograms(res.programs);
      }
    } catch (err) {
      console.error('Failed to fetch saved programs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleDelete = async (pid, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteSavedProgram(pid);
        setPrograms(programs.filter(p => p.id !== pid));
      } catch (err) {
        alert('Failed to delete program.');
      }
    }
  };

  const filtered = programs.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.file_name.toLowerCase().includes(search.toLowerCase()) ||
    p.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <BookmarkCheck className="w-7 h-7 text-purple-600" />
            <span>My Practice & Saved Programs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access your saved solutions, continue writing code from where you left off, or re-run your programs.
          </p>
        </div>

        <Link
          to="/practice"
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Practice Session</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search saved programs by title, filename, or language..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
        />
      </div>

      {/* Grid of Saved Programs */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading your saved programs...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((prog) => (
            <div
              key={prog.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-purple-300 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    {prog.language}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(prog.updated_at || prog.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition">
                  {prog.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>{prog.file_name}</span>
                </div>

                {/* Code Preview Box */}
                <div className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-[11px] line-clamp-3 overflow-hidden border border-slate-800">
                  <code>{prog.code}</code>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleDelete(prog.id, prog.title)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Delete program"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  to={`/practice?savedId=${prog.id}`}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition gap-1"
                >
                  <span>Open & Run</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No Saved Programs Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search ? 'No results matched your search query.' : 'You have not saved any practice programs yet. Write some code and click Save!'}
          </p>
          <Link
            to="/practice"
            className="inline-block mt-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            Start Practicing
          </Link>
        </div>
      )}

    </div>
  );
}
