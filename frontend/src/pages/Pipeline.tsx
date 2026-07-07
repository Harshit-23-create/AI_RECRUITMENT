import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApplications, updateApplicationStatus, deleteApplication } from '../services/api';
import { Sparkles, ChevronDown, ChevronUp, Trash2, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

const STAGES = ['applied', 'screening', 'interviewed', 'offered', 'rejected'];

const STAGE_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  applied:     { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   dot: 'bg-blue-500' },
  screening:   { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-500' },
  interviewed: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  dot: 'bg-amber-500' },
  offered:     { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',dot: 'bg-emerald-500' },
  rejected:    { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    dot: 'bg-red-500' },
};

export default function Pipeline() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedAI, setExpandedAI] = useState<Set<number>>(new Set());

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isRecruiterOrAdmin = user?.role === 'admin' || user?.role === 'recruiter';

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    try {
      const data = await getApplications();
      setApplications(data);
    } catch {
      console.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: number, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const updated = await updateApplicationStatus(appId, newStatus);
      setApplications(prev => prev.map(a => a.id === appId ? updated : a));
    } catch (e) {
      console.error('Failed to update status', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (appId: number) => {
    try {
      await deleteApplication(appId);
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (e) {
      console.error('Failed to delete application', e);
    }
  };

  const toggleAI = (id: number) => {
    setExpandedAI(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getScoreConfig = (score: number) => {
    if (score >= 85) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
    if (score >= 70) return { label: 'Good', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    return { label: 'Moderate', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' };
  };

  const parseJsonList = (str: string | null): string[] => {
    if (!str) return [];
    try { return JSON.parse(str); }
    catch { return [str]; }
  };

  if (loading) {
    return (
      <div className="container py-20 flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading pipeline...
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Hiring Pipeline
        </h1>
        <p className="text-gray-400 mt-1">
          {applications.length} application{applications.length !== 1 ? 's' : ''} across all stages
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
        {STAGES.map(stage => {
          const stageApps = applications.filter(a => a.status === stage);
          const cfg = STAGE_CONFIG[stage];

          return (
            <div key={stage} className={`min-w-[300px] flex-shrink-0 rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}>
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot} shadow-lg`} />
                  <h3 className={`font-semibold capitalize ${cfg.color}`}>{stage}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                  {stageApps.length}
                </span>
              </div>

              {/* Application Cards */}
              <div className="space-y-3">
                {stageApps.map(app => {
                  const scoreConf = app.ats_score ? getScoreConfig(app.ats_score) : null;
                  const isExpanded = expandedAI.has(app.id);
                  const strengths = parseJsonList(app.ai_strengths);
                  const gaps = parseJsonList(app.ai_gaps);
                  const isUpdating = updatingId === app.id;

                  return (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#161b27] border border-white/8 rounded-xl p-4 group hover:border-white/15 transition-all"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-white text-sm leading-tight">
                            {app.candidate_name || `Candidate #${app.candidate_id}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {app.job_title || `Job #${app.job_id}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {app.ats_score && scoreConf && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${scoreConf.bg} ${scoreConf.color} ${scoreConf.border}`}>
                              <Sparkles className="w-2.5 h-2.5" />
                              {app.ats_score}%
                            </div>
                          )}
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Email */}
                      {app.candidate_email && (
                        <div className="text-xs text-gray-600 mb-3 truncate">{app.candidate_email}</div>
                      )}

                      {/* AI Summary */}
                      {app.ai_summary && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 italic bg-white/3 rounded-lg p-2.5 border border-white/5 leading-relaxed">
                            "{app.ai_summary}"
                          </div>
                        </div>
                      )}

                      {/* AI Strengths / Gaps Toggle */}
                      {(strengths.length > 0 || gaps.length > 0) && (
                        <div className="mb-3">
                          <button
                            onClick={() => toggleAI(app.id)}
                            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors w-full"
                          >
                            <Sparkles className="w-3 h-3" />
                            AI Analysis
                            {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mt-2 space-y-2"
                              >
                                {strengths.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 mb-1">
                                      <TrendingUp className="w-3 h-3" /> Strengths
                                    </div>
                                    <ul className="space-y-1">
                                      {strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-gray-400 flex gap-1.5">
                                          <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                                          {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {gaps.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1 text-xs font-medium text-amber-400 mb-1">
                                      <TrendingDown className="w-3 h-3" /> Gaps
                                    </div>
                                    <ul className="space-y-1">
                                      {gaps.map((g, i) => (
                                        <li key={i} className="text-xs text-gray-400 flex gap-1.5">
                                          <span className="text-amber-500 mt-0.5 flex-shrink-0">△</span>
                                          {g}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Status Select (recruiter/admin only) */}
                      {isRecruiterOrAdmin && (
                        <div className="relative">
                          {isUpdating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#161b27]/80 rounded-lg z-10">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            </div>
                          )}
                          <select
                            value={app.status}
                            onChange={e => handleStatusChange(app.id, e.target.value)}
                            disabled={isUpdating}
                            className="w-full text-xs p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50"
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s} className="bg-[#1a1f2e]">
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {stageApps.length === 0 && (
                  <div className="text-xs text-gray-600 text-center py-8 italic border border-dashed border-white/5 rounded-xl">
                    No candidates here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
