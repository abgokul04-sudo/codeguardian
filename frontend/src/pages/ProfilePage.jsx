import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import { User, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle, Save, Calendar, BookmarkCheck, Flame } from 'lucide-react';

export default function ProfilePage() {
  const { user, stats, refreshProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
      };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await updateProfile(payload);
      if (res && res.success) {
        setStatusMsg('Profile updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        refreshProfile();
      } else {
        setErrorMsg(res?.detail || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-3xl font-black shadow-inner">
          {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-2xl font-black">{user?.username || 'User Profile'}</h1>
          <p className="text-xs text-blue-100">{user?.email}</p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-200">
            <Calendar className="w-3.5 h-3.5" />
            <span>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Questions Attempted</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats?.attempted_questions || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Successful Runs</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats?.successful_runs || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Saved Programs</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats?.saved_programs || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Runs</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats?.executions_total || 0}</div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>Account Settings</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Update your personal details, email, or change your account password.
          </p>
        </div>

        {statusMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Password (Leave blank to keep current)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md disabled:opacity-50 transition gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
