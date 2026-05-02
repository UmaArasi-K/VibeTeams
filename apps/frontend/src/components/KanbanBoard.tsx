'use client';

import React, { useState } from 'react';
import { Task, TaskStatus } from '../../../shared/src/types';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMN_TITLES: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  'in-progress': 'In Progress',
  'in-review': 'In Review',
  done: 'Done',
  blocked: 'Blocked'
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div className="task-card glass-card p-4 mb-4 cursor-grab active:cursor-grabbing animate-fade-in">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
          task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {task.priority}
        </span>
        <span className="text-xs text-slate-400">#{task.id.slice(-4)}</span>
      </div>
      <h4 className="font-semibold text-slate-100 mb-1">{task.title}</h4>
      <p className="text-sm text-slate-400 line-clamp-2 mb-3">{task.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {/* Avatar placeholders */}
          <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-slate-800 flex items-center justify-center text-[10px]">JD</div>
        </div>
        {task.dueDate && (
          <span className="text-[10px] text-slate-500">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, onTaskMove }) => {
  return (
    <div className="kanban-column flex flex-col h-full bg-slate-900/40 rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          {COLUMN_TITLES[status]}
          <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </h3>
        <button className="text-slate-500 hover:text-white transition-colors">+</button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Design System Architecture',
      description: 'Define design tokens and component structure for the new coordination platform.',
      status: 'in-progress',
      priority: 'high',
      teamId: 't1',
      projectId: 'p1',
      labels: ['Design'],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: 'Firebase Integration',
      description: 'Connect Firestore and implement real-time listeners for task updates.',
      status: 'backlog',
      priority: 'urgent',
      teamId: 't1',
      projectId: 'p1',
      labels: ['Backend'],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]);

  const moveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 h-full px-8">
      {(['backlog', 'in-progress', 'in-review', 'done', 'blocked'] as TaskStatus[]).map(status => (
        <KanbanColumn 
          key={status} 
          status={status} 
          tasks={tasks.filter(t => t.status === status)}
          onTaskMove={moveTask}
        />
      ))}
    </div>
  );
}
