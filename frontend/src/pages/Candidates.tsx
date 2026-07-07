import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCandidates, uploadResume, updateMyProfile, getMyProfile } from '../services/api';
import { Users, Upload, FileText, CheckCircle, Loader2, X, Pencil, Save } from 'lucide-react';

export default function Candidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSkills, setEditSkills] = useState('');
  const [editExp, setEditExp] = useState('');
  const [editHeadline, setEditHeadline] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isCandidate = user?.role === 'candidate';
  const isRecruiterOrAdmin = user?.role === 'admin' || user?.role === 'recruiter';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allCandidates, myP] = await Promise.all([
        getCandidates(),
        isCandidate ? getMyProfile().catch(() => null) : Promise.resolve(null)
      ]);
      setCandidates(allCandidates);
      if (myP) {
        setMyProfile(myP);
        setEditSkills(myP.parsed_skills || '');
        setEditExp(String(myP.experience_years || ''));
        setEditHeadline(myP.headline || '');
      }
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadResume(file);
      setMyProfile(updated);
      setEditSkills(updated.parsed_skills || '');
      setEditExp(String(updated.experience_years || ''));
      setEditHeadline(updated.headline || '');
      fetchData();
      showToast('Resume uploaded! AI extracted your skills ✨');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await updateMyProfile({
        parsed_skills: editSkills,
        experience_years: parseInt(editExp) || 0,
        headline: editHeadline,
      });
      setMyProfile(updated);
      setEditMode(false);
      showToast('Profile updated!');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Update failed', 'error');
    }
  };

  const getInitials = (candidate: any) => {
    if (candidate.user?.first_name) {
      return `${candidate.user.first_name[0]}${candidate.user.last_name?.[0] || ''}`.toUpperCase();
    }
    return candidate.user?.email?.[0]?.toUpperCase() || '?';
  };

  const getName = (candidate: any) => {
    if (candidate.user?.first_name) {
      return `${candidate.user.first_name} ${candidate.user.last_name || ''}`.trim();
    }
    return candidate.user?.email || `Candidate #${candidate.id}`;
  };

  const AVATAR_COLORS = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-10">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
              toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Talent Pool</h1>
          <p className="text-gray-400 mt-1">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} registered</p>
        </div>
      </div>

      {/* My Profile Card (candidate view) */}
      {isCandidate && myProfile && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 mb-8 border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">My Profile</h3>
            <div className="flex gap-2">
              {!editMode ? (
                <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              ) : (
                <>
                  <button onClick={handleSaveProfile} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                  <button onClick={() => setEditMode(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Parsing...' : 'Upload Resume'}
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={handleResumeUpload} />
            </div>
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Professional Headline</label>
                  <input value={editHeadline} onChange={e => setEditHeadline(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Full-Stack Developer" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Years of Experience</label>
                  <input type="number" value={editExp} onChange={e => setEditExp(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Skills (comma-separated)</label>
                <input value={editSkills} onChange={e => setEditSkills(e.target.value)}
                  className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="React, TypeScript, Python, AWS..." />
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Headline</div>
                <div className="text-sm text-gray-200 font-medium">{myProfile.headline || 'Not set'}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Experience</div>
                <div className="text-sm text-gray-200 font-medium">{myProfile.experience_years ?? 0} years</div>
              </div>
              {myProfile.resume_url && (
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Resume</div>
                  <a href={`http://localhost:8000${myProfile.resume_url}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                    <FileText className="w-3.5 h-3.5" /> View Resume
                  </a>
                </div>
              )}
            </div>
          )}

          {myProfile.parsed_skills && !editMode && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="text-xs text-gray-500 mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {myProfile.parsed_skills.split(',').map((s: string, i: number) => (
                  <span key={i} className="text-xs bg-indigo-500/10 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/20">
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Candidate Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading candidates...
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate, i) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-6 hover:border-white/20 border border-white/5 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                  {getInitials(candidate)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{getName(candidate)}</h3>
                  <p className="text-xs text-gray-500">{candidate.user?.email}</p>
                  {candidate.headline && <p className="text-xs text-indigo-400 mt-0.5">{candidate.headline}</p>}
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-gray-500">Experience</span>
                  <span className="font-medium text-gray-200">{candidate.experience_years ?? 0} years</span>
                </div>
                {candidate.resume_url && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Resume</span>
                    <a href={`http://localhost:8000${candidate.resume_url}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-medium">
                      <FileText className="w-3 h-3" /> View
                    </a>
                  </div>
                )}
              </div>

              {candidate.parsed_skills && (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.parsed_skills.split(',').slice(0, 5).map((skill: string, si: number) => (
                    <span key={si} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full">
                      {skill.trim()}
                    </span>
                  ))}
                  {candidate.parsed_skills.split(',').length > 5 && (
                    <span className="text-xs text-gray-600 px-2 py-0.5">
                      +{candidate.parsed_skills.split(',').length - 5} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          {candidates.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No candidates yet</p>
              <p className="text-sm mt-1 opacity-60">Candidates register and add profiles to appear here</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
