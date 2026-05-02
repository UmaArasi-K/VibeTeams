'use client';

import React, { useState } from 'react';

interface TeamMember {
  userId: string;
  displayName: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export default function TeamSettingsPage() {
  const [members] = useState<TeamMember[]>([
    { userId: '1', displayName: 'Uma Arasi', email: 'uma@vibeteams.com', role: 'owner' },
    { userId: '2', displayName: 'Priya K', email: 'priya@vibeteams.com', role: 'admin' },
    { userId: '3', displayName: 'Raj S', email: 'raj@vibeteams.com', role: 'member' },
  ]);

  const [integrations] = useState([
    { provider: 'Google Calendar', enabled: true, icon: '📅' },
    { provider: 'Google Drive', enabled: true, icon: '📁' },
    { provider: 'Google Meet', enabled: false, icon: '🎥' },
    { provider: 'Google Chat', enabled: false, icon: '💬' },
  ]);

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-500/20 text-amber-400',
    admin: 'bg-purple-500/20 text-purple-400',
    member: 'bg-blue-500/20 text-blue-400',
    viewer: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <main className="flex h-screen bg-[#0f172a]">
      <aside className="w-64 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-text">VibeTeams</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2 tracking-wider">Settings</div>
          <a href="/settings/team" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span>👥</span> Team
          </a>
          <a href="/settings/profile" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-all">
            <span>👤</span> Profile
          </a>
          <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-all">
            <span>📊</span> Dashboard
          </a>
        </nav>
      </aside>

      <section className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Team Settings</h2>
            <p className="text-slate-400">Manage your team members and integrations.</p>
          </div>

          {/* Team Members */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-200">Team Members</h3>
              <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                Invite Member
              </button>
            </div>
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.userId} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                      {member.displayName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{member.displayName}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${roleColors[member.role]}`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Integrations */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-6">Google Workspace Integrations</h3>
            <div className="grid grid-cols-2 gap-4">
              {integrations.map(integration => (
                <div key={integration.provider} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{integration.provider}</p>
                      <p className="text-xs text-slate-500">{integration.enabled ? 'Connected' : 'Not connected'}</p>
                    </div>
                  </div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    integration.enabled 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}>
                    {integration.enabled ? 'Connected' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
