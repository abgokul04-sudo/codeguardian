import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/api';
import { Loader2, Clock, CheckCircle, AlertCircle, AlertTriangle, Globe } from 'lucide-react';

const LANGUAGE_LABELS = {
  en: 'English 🇬🇧',
  ta: 'Tamil (தமிழ்) 🇮🇳',
  te: 'Telugu (తెలుగు) 🇮🇳',
  hi: 'Hindi (हिन्दी) 🇮🇳',
  ml: 'Malayalam (മലയാളം) 🇮🇳'
};

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        setHistory(data.history || []);
      } catch (err) {
        setError('Failed to load review history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review & Tutor History</h2>
            <p className="text-xs text-gray-500">Log of reviewed code snippets and multilingual sessions</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-200 text-sm font-medium">{error}</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <p className="text-base font-medium">No reviews logged yet.</p>
            <p className="text-xs text-gray-500 mt-1">Review some code to see your learning history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Code Language</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Explanation Language</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Issues Identified</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-mono text-xs">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs uppercase">
                        {item.language}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-800">
                      <span className="inline-flex items-center text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {LANGUAGE_LABELS[item.explanation_language] || item.explanation_language || 'English'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.has_errors ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Errors Fixed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" /> Clean Code
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-700">
                      {item.issues_count} issue(s)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
