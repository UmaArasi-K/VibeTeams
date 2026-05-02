export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Date;
  teams: string[]; // List of team IDs
}

export interface TeamMember {
  userId: string;
  role: UserRole;
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, TeamMember>; // Keyed by userId
  createdAt: Date;
}

export interface Project {
  id: string;
  teamId: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  startDate: Date;
  endDate: Date;
  ownerId: string;
}

export type TaskStatus = 'backlog' | 'in-progress' | 'in-review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  dueDate?: Date;
  labels: string[];
  attachments: Attachment[];
  calendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string; // e.g., 'google-drive', 'upload'
  fileId?: string; // Drive file ID
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'status_changed' | 'mention' | 'team_invite';
  message: string;
  taskId?: string;
  read: boolean;
  createdAt: Date;
}
