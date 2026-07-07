import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getUsers } from '../services/api';
import { Shield, User, Mail, Calendar, Loader2 } from 'lucide-react';

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:     { label: 'Admin',     cls: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  recruiter: { label: 'Recruiter', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  candidate: { label: 'Candidate', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
};

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
];

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container py-20 flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading admin panel...
      </div>
    );
  }

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    recruiter: users.filter(u => u.role === 'recruiter').length,
    candidate: users.filter(u => u.role === 'candidate').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-500/10">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Administration</h1>
        </div>
        <p className="text-gray-400">Manage platform users and view system overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {Object.entries(roleStats).map(([role, count]) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <div key={role} className={`glass-card rounded-2xl p-5 border ${cfg.cls.split(' ').find(c => c.startsWith('border')) || 'border-white/5'}`}>
              <div className={`text-3xl font-bold ${cfg.cls.split(' ').find(c => c.startsWith('text')) || 'text-white'}`}>{count}</div>
              <div className="text-sm text-gray-500 mt-1 capitalize">{role}s</div>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-white">All Users ({users.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/3 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || user.email?.[0] || '?'}`.toUpperCase();
                const roleCfg = ROLE_CONFIG[user.role] || { label: user.role, cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
                return (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-200">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${roleCfg.cls}`}>
                        {roleCfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
