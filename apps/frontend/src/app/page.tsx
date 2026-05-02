import KanbanBoard from '@/components/KanbanBoard';

export default function Home() {
  return (
    <main className="flex h-screen overflow-hidden bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold gradient-text">VibeTeams</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="text-xs font-semibold text-slate-500 uppercase px-2 mb-2 tracking-wider">Workspace</div>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span>📊</span> Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-all">
            <span>📅</span> Calendar
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-all">
            <span>📁</span> Projects
          </a>
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-card p-4 bg-indigo-600/10 border-indigo-500/20">
            <p className="text-xs text-indigo-300 font-medium mb-1">Trial Version</p>
            <p className="text-[10px] text-indigo-400/80 mb-3">Upgrade to Pro for more team capacity.</p>
            <button className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <section className="flex-1 flex flex-col">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-slate-900/20">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-200">Main Project Board</h2>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">Active</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search tasks..." 
                className="bg-slate-800/50 border border-white/5 rounded-full px-4 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Workflow Overview</h3>
              <p className="text-sm text-slate-400">Track and manage your team's progress in real-time.</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium border border-white/5 hover:bg-slate-700 transition-all">
                Gantt View
              </button>
              <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
                New Task
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <KanbanBoard />
          </div>
        </div>
      </section>
    </main>
  );
}
