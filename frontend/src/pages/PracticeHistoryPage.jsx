import React, { useState, useEffect } from 'react';
import { getPracticeHistory } from '../services/api';
import { Clock, CheckCircle2, AlertCircle, FileCode, Search, Terminal } from 'lucide-react';

export default function PracticeHistoryPage() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getPracticeHistory();
        if (res && res.history) {
          setHistory(res.history);
        }
      } catch (err) {
        console.error('Failed to load execution history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filtered = history.filter(h => 
    h.question_name.toLowerCase().includes(search.toLowerCase()) ||
    h.language.toLowerCase().includes(search.toLowerCase()) ||
    h.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-amber-600" />
          <span>Practice & Execution History</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Detailed log of your code compilations, inputs, execution times, and status results.
        </p>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter history by question, language, or status..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
        />
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            Loading execution history...
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Question / Title</th>
                  <th className="px-6 py-3.5">Language</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Time (ms)</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5">Code Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.question_name}
                      <div className="text-[10px] text-slate-400 font-mono font-normal">{item.file_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded uppercase font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {item.language}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'success' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'timeout' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {item.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {item.execution_time_ms} ms
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-sans">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-slate-950 text-emerald-400 px-3 py-1.5 rounded-lg font-mono text-[10px] max-w-xs truncate border border-slate-800">
                        {item.code}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-xs space-y-2">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <p>No execution history recorded yet. Run programs in the practice editor to track your attempts!</p>
          </div>
        )}
      </div>

    </div>
  );
}
