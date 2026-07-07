import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getJobs, createJob, deleteJob, createApplication } from '../services/api';
import { Briefcase, Plus, MapPin, Building2, Trash2, Send, X, CheckCircle, Loader2 } from 'lucide-react';

export default function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [applying, setApplying] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isRecruiterOrAdmin = user?.role === 'admin' || user?.role === 'recruiter';
  const isCandidate = user?.role === 'candidate';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch {
      showToast('Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createJob({ title, description, department, location, salary_range: salaryRange, is_active: true });
      setShowForm(false);
      setTitle(''); setDescription(''); setDepartment(''); setLocation(''); setSalaryRange('');
      fetchJobs();
      showToast('Job posted successfully! 🎉');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to post job', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this job? All applications will be removed.')) return;
    try {
      await deleteJob(id);
      fetchJobs();
      showToast('Job deleted');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete job', 'error');
    }
  };

  const handleApply = async (jobId: number) => {
    setApplying(jobId);
    try {
      await createApplication(jobId);
      showToast('Application submitted! 🚀');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to apply', 'error');
    } finally {
      setApplying(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-10">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${
              toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Job Openings</h1>
          <p className="text-gray-400 mt-1">{jobs.length} position{jobs.length !== 1 ? 's' : ''} available</p>
        </div>
        {isRecruiterOrAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Post Job'}
          </button>
        )}
      </div>

      {/* Job Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="glass-card p-6 rounded-2xl border border-indigo-500/20">
              <h3 className="text-xl font-bold text-white mb-6">Create New Job Posting</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Job Title *</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Senior Software Engineer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Department</label>
                    <input value={department} onChange={e => setDepartment(e.target.value)}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Engineering" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Remote / Bangalore" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Salary Range</label>
                    <input value={salaryRange} onChange={e => setSalaryRange(e.target.value)}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. ₹15–25 LPA" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Job Description *</label>
                  <textarea required value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-28 resize-none"
                    placeholder="Describe the role, requirements, and tech stack..." />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
                    <Plus className="h-4 w-4" /> Post Job
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading jobs...
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-6 group hover:border-indigo-500/30 border border-white/5 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-indigo-500/10">
                  <Briefcase className="h-5 w-5 text-indigo-400" />
                </div>
                {isRecruiterOrAdmin && (
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <h3 className="font-bold text-lg text-white mb-1 leading-tight">{job.title}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">{job.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {job.department && (
                  <span className="flex items-center gap-1 text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full">
                    <Building2 className="w-3 h-3" /> {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1 text-xs bg-white/5 text-gray-400 px-2.5 py-1 rounded-full">
                    <MapPin className="w-3 h-3" /> {job.location}
                  </span>
                )}
                {job.salary_range && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full">
                    {job.salary_range}
                  </span>
                )}
              </div>

              {isCandidate && (
                <button
                  onClick={() => handleApply(job.id)}
                  disabled={applying === job.id}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-medium transition-colors text-sm"
                >
                  {applying === job.id ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Applying...</>
                  ) : (
                    <><Send className="h-3.5 w-3.5" /> Apply Now</>
                  )}
                </button>
              )}
            </motion.div>
          ))}
          {jobs.length === 0 && !showForm && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl">
              <Briefcase className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">No jobs posted yet</p>
              <p className="text-sm mt-1 opacity-60">Recruiters can post their first opening above</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
