import express, { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';
import { z } from 'zod';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const pubsub = new PubSub();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

// ──────────────────────────────────────────────
// Validation Schemas (Domain Layer)
// ──────────────────────────────────────────────
const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  status: z.enum(['backlog', 'in-progress', 'in-review', 'done', 'blocked']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  projectId: z.string().min(1),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.array(z.string()).default([]),
});

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['backlog', 'in-progress', 'in-review', 'done', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

// ──────────────────────────────────────────────
// State Machine (Domain Layer)
// Valid transitions: Backlog → In Progress → In Review → Done / Blocked
// ──────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  'backlog': ['in-progress', 'blocked'],
  'in-progress': ['in-review', 'blocked', 'backlog'],
  'in-review': ['done', 'in-progress', 'blocked'],
  'done': ['backlog'],
  'blocked': ['backlog', 'in-progress'],
};

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────────
// Pub/Sub Event Publishing (Domain Layer)
// ──────────────────────────────────────────────
async function publishEvent(topicName: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const topic = pubsub.topic(topicName);
    await topic.publishMessage({ json: { ...payload, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error(`Failed to publish to ${topicName}:`, error);
  }
}

// ──────────────────────────────────────────────
// Response Envelope (API Contract - Section 9.1)
// ──────────────────────────────────────────────
function envelope(data: unknown, error: unknown = null) {
  return {
    data,
    error,
    meta: {
      requestId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    },
  };
}

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send(envelope({ status: 'OK', service: 'task-service' }));
});

// ──────────────────────────────────────────────
// GET /api/v1/teams/:teamId/tasks — List tasks
// ──────────────────────────────────────────────
app.get('/api/v1/teams/:teamId/tasks', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { status, assignee, project, after, limit: limitStr } = req.query;
    const limit = Math.min(parseInt(limitStr as string) || 25, 100);

    let query: admin.firestore.Query = db.collection('teams').doc(teamId).collection('tasks');

    if (status) query = query.where('status', '==', status);
    if (assignee) query = query.where('assigneeId', '==', assignee);
    if (project) query = query.where('projectId', '==', project);

    query = query.orderBy('updatedAt', 'desc').limit(limit + 1);

    if (after) {
      const afterDoc = await db.collection('teams').doc(teamId).collection('tasks').doc(after as string).get();
      if (afterDoc.exists) query = query.startAfter(afterDoc);
    }

    const snapshot = await query.get();
    const tasks = snapshot.docs.slice(0, limit).map(doc => ({ id: doc.id, ...doc.data() }));
    const hasMore = snapshot.docs.length > limit;

    res.status(200).send(envelope({
      tasks,
      pagination: {
        hasMore,
        nextCursor: hasMore ? tasks[tasks.length - 1]?.id : null,
      },
    }));
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', title: 'Failed to list tasks', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/teams/:teamId/tasks — Create task
// ──────────────────────────────────────────────
app.post('/api/v1/teams/:teamId/tasks', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const validatedData = CreateTaskSchema.parse(req.body);

    const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc();
    const task = {
      ...validatedData,
      id: taskRef.id,
      teamId,
      attachments: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await taskRef.set(task);

    // Publish task.assigned event if assignee is set
    if (validatedData.assigneeId) {
      await publishEvent('task.assigned', {
        taskId: taskRef.id,
        teamId,
        assigneeId: validatedData.assigneeId,
        assignedBy: req.headers['x-user-id'] || 'system',
        dueDate: validatedData.dueDate,
      });
    }

    res.status(201).send(envelope(task));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).send(envelope(null, { type: 'VALIDATION_ERROR', title: 'Invalid task data', detail: error.errors }));
      return;
    }
    console.error('Error creating task:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', title: 'Failed to create task', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// PATCH /api/v1/teams/:teamId/tasks/:taskId — Update task
// ──────────────────────────────────────────────
app.patch('/api/v1/teams/:teamId/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { teamId, taskId } = req.params;
    const validatedData = UpdateTaskSchema.parse(req.body);

    const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc(taskId);
    const existing = await taskRef.get();

    if (!existing.exists) {
      res.status(404).send(envelope(null, { type: 'NOT_FOUND', title: 'Task not found' }));
      return;
    }

    const existingData = existing.data()!;

    // Validate state machine transition
    if (validatedData.status && validatedData.status !== existingData.status) {
      if (!isValidTransition(existingData.status, validatedData.status)) {
        res.status(422).send(envelope(null, {
          type: 'INVALID_TRANSITION',
          title: 'Invalid status transition',
          detail: `Cannot move from "${existingData.status}" to "${validatedData.status}"`,
        }));
        return;
      }
    }

    const updateData = {
      ...validatedData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await taskRef.update(updateData);

    // Publish state change event
    if (validatedData.status && validatedData.status !== existingData.status) {
      await publishEvent('task.state.changed', {
        taskId,
        teamId,
        fromState: existingData.status,
        toState: validatedData.status,
        changedBy: req.headers['x-user-id'] || 'system',
      });
    }

    res.status(200).send(envelope({ id: taskId, ...existingData, ...updateData }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).send(envelope(null, { type: 'VALIDATION_ERROR', title: 'Invalid update data', detail: error.errors }));
      return;
    }
    console.error('Error updating task:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', title: 'Failed to update task', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// DELETE /api/v1/teams/:teamId/tasks/:taskId — Archive (soft delete)
// ──────────────────────────────────────────────
app.delete('/api/v1/teams/:teamId/tasks/:taskId', async (req: Request, res: Response) => {
  try {
    const { teamId, taskId } = req.params;
    const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc(taskId);
    const existing = await taskRef.get();

    if (!existing.exists) {
      res.status(404).send(envelope(null, { type: 'NOT_FOUND', title: 'Task not found' }));
      return;
    }

    // Soft delete — mark as archived
    await taskRef.update({
      status: 'archived',
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send(envelope({ id: taskId, archived: true }));
  } catch (error) {
    console.error('Error archiving task:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', title: 'Failed to archive task', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/teams/:teamId/tasks/:taskId/comments
// ──────────────────────────────────────────────
app.post('/api/v1/teams/:teamId/tasks/:taskId/comments', async (req: Request, res: Response) => {
  try {
    const { teamId, taskId } = req.params;
    const { content } = req.body;
    const authorId = req.headers['x-user-id'] as string || 'anonymous';

    if (!content || typeof content !== 'string') {
      res.status(400).send(envelope(null, { type: 'VALIDATION_ERROR', title: 'Comment content is required' }));
      return;
    }

    const commentRef = db.collection('teams').doc(teamId).collection('tasks').doc(taskId).collection('comments').doc();
    const comment = {
      id: commentRef.id,
      content,
      authorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await commentRef.set(comment);

    await publishEvent('task.comment.added', {
      taskId,
      teamId,
      commentId: commentRef.id,
      authorId,
    });

    res.status(201).send(envelope(comment));
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', title: 'Failed to add comment', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/teams/:teamId/projects — List projects
// ──────────────────────────────────────────────
app.get('/api/v1/teams/:teamId/projects', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const snapshot = await db.collection('teams').doc(teamId).collection('projects').get();
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).send(envelope(projects));
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', title: 'Failed to list projects', detail: (error as Error).message }));
  }
});

app.listen(PORT, () => {
  console.log(`Task service listening on port ${PORT}`);
});

export default app;
