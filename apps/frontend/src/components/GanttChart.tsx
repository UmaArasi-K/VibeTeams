'use client';

import React from 'react';
import { Task } from '../../../shared/src/types';

interface GanttChartProps {
  tasks: Task[];
}

export default function GanttChart({ tasks }: GanttChartProps) {
  // Simplified Gantt visualization
  return (
    <div className="glass-card flex-1 flex flex-col overflow-hidden bg-slate-900/40 p-6 border border-white/5">
      <div className="flex border-b border-white/5 pb-4 mb-4">
        <div className="w-64 font-semibold text-slate-400 text-sm">Task Name</div>
        <div className="flex-1 flex justify-around font-semibold text-slate-500 text-[10px] uppercase tracking-tighter">
          {['May 01', 'May 02', 'May 03', 'May 04', 'May 05', 'May 06', 'May 07'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4">
        {tasks.map((task, i) => (
          <div key={task.id} className="flex items-center group">
            <div className="w-64 text-sm text-slate-200 group-hover:text-indigo-400 transition-colors">
              {task.title}
            </div>
            <div className="flex-1 relative h-6 bg-slate-800/30 rounded-full overflow-hidden">
              <div 
                className={`absolute h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] animate-fade-in`}
                style={{
                  left: `${(i * 15) % 60}%`,
                  width: '30%',
                  animationDelay: `${i * 0.1}s`
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-500 italic">
        * Timeline visualization is based on scheduled due dates and dependencies.
      </div>
    </div>
  );
}
