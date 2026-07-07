import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getApplications, getJobs, getCandidates } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Users, Briefcase, Loader2, Sparkles } from 'lucide-react';

const STAGE_ORDER = ['applied', 'screening', 'interviewed', 'offered', 'rejected'];

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#ef4444'];

export default function Reports() {
  const [applications, setApplications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getApplications(), getJobs(), getCandidates()])
      .then(([apps, j, c]) => {
        setApplications(apps);
        setJobs(j);
        setCandidates(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Funnel Data ──────────────────────────────────────────────────────────
  const funnelData = STAGE_ORDER.map(stage => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: applications.filter(a => a.status === stage).length,
  }));

  // ─── ATS Score per Job ────────────────────────────────────────────────────
  const scoredApps = applications.filter(a => a.ats_score);
  const jobScoreMap: Record<string, { total: number; count: number; title: string }> = {};
  for (const app of scoredApps) {
    const key = String(app.job_id);
    if (!jobScoreMap[key]) {
      const job = jobs.find(j => j.id === app.job_id);
      jobScoreMap[key] = { total: 0, count: 0, title: job?.title || `Job #${app.job_id}` };
    }
    jobScoreMap[key].total += app.ats_score;
    jobScoreMap[key].count += 1;
  }
  const avgScoreData = Object.values(jobScoreMap)
    .map(({ title, total, count }) => ({ name: title.length > 18 ? title.slice(0, 18) + '…' : title, score: Math.round(total / count) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // ─── Top Skills ───────────────────────────────────────────────────────────
  const skillCounts: Record<string, number> = {};
  for (const c of candidates) {
    if (c.parsed_skills) {
      c.parsed_skills.split(',').forEach((s: string) => {
        const key = s.trim().toLowerCase();
        if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
      });
    }
  }
  const topSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  // ─── Overall Metrics ──────────────────────────────────────────────────────
  const conversionRate = applications.length > 0
    ? Math.round((applications.filter(a => a.status === 'offered').length / applications.length) * 100)
    : 0;

  const avgScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((sum, a) => sum + a.ats_score, 0) / scoredApps.length)
    : 0;

  if (loading) {
    return (
      <div className="container py-20 flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading reports...
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Analytics & Reports
        </h1>
        <p className="text-gray-400 mt-1">Insights across your entire hiring pipeline</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Applications', value: applications.length, icon: BarChart3, color: 'from-indigo-500 to-indigo-600' },
          { label: 'Offer Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Avg AI Score', value: avgScore ? `${avgScore}%` : 'N/A', icon: Sparkles, color: 'from-purple-500 to-purple-600' },
          { label: 'Active Candidates', value: candidates.length, icon: Users, color: 'from-amber-500 to-amber-600' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-5 relative overflow-hidden"
          >
            <div className={`absolute -top-3 -right-3 w-16 h-16 rounded-full bg-gradient-to-br ${kpi.color} opacity-10`} />
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${kpi.color} mb-3`}>
              <kpi.icon className="w-4 h-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Hiring Funnel */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-1">Hiring Funnel</h3>
          <p className="text-xs text-gray-500 mb-6">Candidate conversion through pipeline stages</p>
          {applications.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">No applications yet</div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f2e', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Avg ATS Score per Job */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-base font-semibold text-white mb-1">Avg AI Score by Job</h3>
          <p className="text-xs text-gray-500 mb-6">Which positions are attracting the best candidates</p>
          {avgScoreData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">
              Move applications to "Screening" to generate AI scores
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgScoreData} margin={{ top: 5, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} angle={-25} textAnchor="end" />
                  <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f2e', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    formatter={(v: any) => [`${v}%`, 'Avg Score']}
                  />
                  <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Skills */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-1">Top Skills in Talent Pool</h3>
        <p className="text-xs text-gray-500 mb-6">Most common skills across all candidate profiles</p>
        {topSkills.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-600 text-sm">
            No skills data yet — candidates need to add skills to their profiles
          </div>
        ) : (
          <div className="space-y-3">
            {topSkills.map((skill, i) => {
              const maxVal = topSkills[0].value;
              const pct = Math.round((skill.value / maxVal) * 100);
              const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#fbbf24', '#f97316', '#fb923c'];
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-300 font-medium text-right flex-shrink-0">{skill.name}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <div className="w-8 text-xs text-gray-500 text-right flex-shrink-0">{skill.value}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
