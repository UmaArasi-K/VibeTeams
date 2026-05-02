import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { PubSub, Message } from '@google-cloud/pubsub';

admin.initializeApp();
const db = admin.firestore();
const pubsub = new PubSub();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8082;

// ──────────────────────────────────────────────
// Response Envelope
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
// Notification Types
// ──────────────────────────────────────────────
type NotificationType = 'task_assigned' | 'status_changed' | 'mention' | 'team_invite' | 'comment_added';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string;
  teamId: string;
}

// ──────────────────────────────────────────────
// Write notification to Firestore
// ──────────────────────────────────────────────
async function createNotification(payload: NotificationPayload): Promise<string> {
  const notifRef = db
    .collection('users').doc(payload.userId)
    .collection('notifications').doc();

  await notifRef.set({
    id: notifRef.id,
    type: payload.type,
    message: payload.message,
    taskId: payload.taskId || null,
    teamId: payload.teamId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return notifRef.id;
}

// ──────────────────────────────────────────────
// Pub/Sub Handlers — consume events from Event Catalog (Section 7)
// ──────────────────────────────────────────────

// Handler: task.state.changed
async function handleTaskStateChanged(data: Record<string, string>): Promise<void> {
  const { taskId, teamId, fromState, toState, changedBy } = data;

  // Get the task to find the assignee
  const taskDoc = await db.collection('teams').doc(teamId).collection('tasks').doc(taskId).get();
  if (!taskDoc.exists) return;

  const task = taskDoc.data()!;

  // Notify the assignee if they didn't make the change themselves
  if (task.assigneeId && task.assigneeId !== changedBy) {
    await createNotification({
      userId: task.assigneeId,
      type: 'status_changed',
      message: `Task "${task.title}" moved from ${fromState} to ${toState}`,
      taskId,
      teamId,
    });
  }
}

// Handler: task.assigned
async function handleTaskAssigned(data: Record<string, string>): Promise<void> {
  const { taskId, teamId, assigneeId, assignedBy } = data;

  const taskDoc = await db.collection('teams').doc(teamId).collection('tasks').doc(taskId).get();
  if (!taskDoc.exists) return;

  const task = taskDoc.data()!;

  if (assigneeId !== assignedBy) {
    await createNotification({
      userId: assigneeId,
      type: 'task_assigned',
      message: `You were assigned to "${task.title}"`,
      taskId,
      teamId,
    });
  }
}

// Handler: task.comment.added
async function handleCommentAdded(data: Record<string, string>): Promise<void> {
  const { taskId, teamId, authorId } = data;

  const taskDoc = await db.collection('teams').doc(teamId).collection('tasks').doc(taskId).get();
  if (!taskDoc.exists) return;

  const task = taskDoc.data()!;

  // Notify assignee about the new comment
  if (task.assigneeId && task.assigneeId !== authorId) {
    await createNotification({
      userId: task.assigneeId,
      type: 'comment_added',
      message: `New comment on "${task.title}"`,
      taskId,
      teamId,
    });
  }
}

// Handler: team.member.added
async function handleTeamMemberAdded(data: Record<string, string>): Promise<void> {
  const { teamId, userId, invitedBy } = data;

  const teamDoc = await db.collection('teams').doc(teamId).get();
  const teamName = teamDoc.exists ? teamDoc.data()!.name : 'a team';

  await createNotification({
    userId,
    type: 'team_invite',
    message: `You were added to "${teamName}"`,
    teamId,
  });
}

// ──────────────────────────────────────────────
// Pub/Sub Push Endpoint — receives messages from Cloud Pub/Sub
// ──────────────────────────────────────────────
app.post('/api/v1/notifications/push', async (req: Request, res: Response) => {
  try {
    const message = req.body.message;
    if (!message || !message.data) {
      res.status(400).send(envelope(null, { type: 'BAD_REQUEST', title: 'Missing message data' }));
      return;
    }

    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const topic = message.attributes?.topic || req.body.subscription;

    // Route to appropriate handler
    if (topic?.includes('task.state.changed')) {
      await handleTaskStateChanged(data);
    } else if (topic?.includes('task.assigned')) {
      await handleTaskAssigned(data);
    } else if (topic?.includes('task.comment.added')) {
      await handleCommentAdded(data);
    } else if (topic?.includes('team.member.added')) {
      await handleTeamMemberAdded(data);
    }

    res.status(200).send(envelope({ processed: true }));
  } catch (error) {
    console.error('Push notification processing error:', error);
    res.status(500).send(envelope(null, { type: 'PROCESSING_ERROR', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/users/:userId/notifications — List user notifications
// ──────────────────────────────────────────────
app.get('/api/v1/users/:userId/notifications', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { unreadOnly } = req.query;

    let query: admin.firestore.Query = db
      .collection('users').doc(userId)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50);

    if (unreadOnly === 'true') {
      query = query.where('read', '==', false);
    }

    const snapshot = await query.get();
    const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).send(envelope(notifications));
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// PATCH /api/v1/users/:userId/notifications/:notifId — Mark as read
// ──────────────────────────────────────────────
app.patch('/api/v1/users/:userId/notifications/:notifId', async (req: Request, res: Response) => {
  try {
    const { userId, notifId } = req.params;
    await db
      .collection('users').doc(userId)
      .collection('notifications').doc(notifId)
      .update({ read: true });

    res.status(200).send(envelope({ id: notifId, read: true }));
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).send(envelope(null, { type: 'SERVER_ERROR', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send(envelope({ status: 'OK', service: 'notification-service' }));
});

app.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});

export default app;
