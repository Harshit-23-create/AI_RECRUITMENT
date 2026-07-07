import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, LayoutDashboard, Users, FileText, LogOut, Shield, BarChart3, TrendingUp, Award, Bell, MessageSquare, Send, X, Sparkles, Check } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import './index.css';

import Jobs from './pages/Jobs';
import Candidates from './pages/Candidates';
import Pipeline from './pages/Pipeline';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import { getDashboardStats, logout, getNotifications, markNotificationRead, submitChatQuery } from './services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ------------------------------------------------------------------------------
function Navbar() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // refresh every 10s
      return () => clearInterval(interval);
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/jobs', label: 'Jobs', icon: Briefcase },
    { to: '/candidates', label: 'Candidates', icon: Users },
    { to: '/pipeline', label: 'Pipeline', icon: FileText },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isAuthPage) return null;

  return (

    <nav className="border-b border-white/10 bg-[#0d1117]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0d1117]/60 sticky top-0 z-50 w-full">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Award className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">TalentAI</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  location.pathname === '/admin'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        {user && (
          <div className="flex items-center gap-4 relative">
            {/* Bell Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors relative"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0d1117]" />
                )}
              </button>

              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-[#161b27] border border-white/10 rounded-xl p-3 shadow-xl z-50 text-xs"
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                      <span className="font-bold text-gray-200">Notifications</span>
                      {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">{unreadCount} new</span>}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-lg border transition-all ${
                              n.is_read ? 'bg-transparent border-transparent text-gray-400' : 'bg-white/5 border-white/5 text-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-semibold">{n.title}</span>
                              {!n.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="text-indigo-400 hover:text-indigo-300 p-0.5 bg-white/5 rounded"
                                  title="Mark as read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-gray-600 block mt-1">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-200 leading-tight">{user.first_name || 'User'}</div>
                <div className="text-xs text-gray-500 capitalize leading-tight">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-500 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const STAT_COLORS = [
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-purple-500 to-purple-600',
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

const weeklyData = [
  { name: 'Mon', applications: 12, screens: 4 },
  { name: 'Tue', applications: 19, screens: 7 },
  { name: 'Wed', applications: 8, screens: 3 },
  { name: 'Thu', applications: 24, screens: 9 },
  { name: 'Fri', applications: 16, screens: 6 },
  { name: 'Sat', applications: 6, screens: 2 },
  { name: 'Sun', applications: 9, screens: 3 },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function Dashboard() {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      title: 'Total Candidates',
      value: loading ? '—' : stats?.total_candidates ?? 0,
      icon: Users,
      desc: 'In talent pool',
      gradient: STAT_COLORS[0],
    },
    {
      title: 'Active Jobs',
      value: loading ? '—' : stats?.active_jobs ?? 0,
      icon: Briefcase,
      desc: 'Open positions',
      gradient: STAT_COLORS[1],
    },
    {
      title: 'Applications',
      value: loading ? '—' : stats?.total_applications ?? 0,
      icon: FileText,
      desc: 'Total submitted',
      gradient: STAT_COLORS[2],
    },
    {
      title: 'Offers Extended',
      value: loading ? '—' : stats?.recent_hires ?? 0,
      icon: TrendingUp,
      desc: 'Successful offers',
      gradient: STAT_COLORS[3],
    },
  ];

  const pieData = stats
    ? Object.entries(stats.applications_by_status || {}).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Welcome back, <span className="text-gray-200 font-semibold">{user.first_name || 'User'}</span>! Here's your hiring overview.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl glass-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform"
          >
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 shadow-lg`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm font-medium text-gray-300 mt-0.5">{stat.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Area Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-1">Application Activity</h3>
          <p className="text-xs text-gray-500 mb-6">Applications vs. screenings this week</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorScreens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4b5563" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1f2e', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <Area type="monotone" dataKey="applications" stroke="#6366f1" fillOpacity={1} fill="url(#colorApps)" strokeWidth={2} />
                <Area type="monotone" dataKey="screens" stroke="#10b981" fillOpacity={1} fill="url(#colorScreens)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-indigo-500 inline-block" /> Applications</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-emerald-500 inline-block" /> Screenings</span>
          </div>
        </div>

        {/* Pipeline Distribution + Recent Activity */}
        <div className="space-y-6">
          {pieData.length > 0 ? (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">Pipeline Status</h3>
              <div className="flex justify-center mb-3">
                <PieChart width={160} height={160}>
                  <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-1.5">
                {pieData.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-400 capitalize">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {entry.name}
                    </span>
                    <span className="font-semibold text-gray-200">{String(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {[
                  { text: 'Start by posting a job opening', color: 'bg-indigo-500', icon: '💼' },
                  { text: 'Candidates will apply and appear in pipeline', color: 'bg-emerald-500', icon: '👥' },
                  { text: 'AI will evaluate candidates automatically', color: 'bg-purple-500', icon: '🤖' },
                  { text: 'Track progress through hiring stages', color: 'bg-amber-500', icon: '📊' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-lg">{item.icon}</span>
                    <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { role: 'assistant', text: 'Hello! I am your TalentAI Assistant. I can search candidate databases or summarize roles for you. Try asking: **"show candidates with React skills"**.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;
  const isRecruiterOrAdmin = user?.role === 'admin' || user?.role === 'recruiter';

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const result = await submitChatQuery(userMsg);
      setChatMessages(prev => [...prev, { role: 'assistant', text: result.response }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I failed to process that request. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#0d1117] font-sans antialiased text-foreground">
        <Navbar />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
          </Routes>
        </AnimatePresence>

        {/* Floating Chat Widget for Recruiter / Admin */}
        {isRecruiterOrAdmin && (
          <>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/25 transition-all hover:scale-105 z-40 flex items-center justify-center border border-indigo-500/30"
            >
              {chatOpen ? <X className="w-5.5 h-5.5" /> : <Sparkles className="w-5.5 h-5.5 animate-pulse" />}
            </button>

            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.95 }}
                  className="fixed bottom-24 right-6 w-96 h-[500px] bg-[#161b27] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
                >
                  {/* Chat Header */}
                  <div className="bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-4 py-3.5 border-b border-white/5 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">TalentAI Assistant</h4>
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Online
                      </span>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/5 border border-white/5 text-gray-200'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/5 border border-white/5 text-gray-400 rounded-xl p-3 text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100" />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 flex gap-2 items-center bg-[#161b27]">
                    <input
                      required
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask anything about candidates/jobs..."
                      className="flex-1 p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
