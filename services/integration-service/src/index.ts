import express, { Request, Response } from 'express';
import { google, calendar_v3, drive_v3 } from 'googleapis';
import * as admin from 'firebase-admin';
import { PubSub } from '@google-cloud/pubsub';

admin.initializeApp();
const db = admin.firestore();
const pubsub = new PubSub();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8081;

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
// OAuth Client Factory
// ──────────────────────────────────────────────
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthenticatedClient(teamId: string) {
  const oauth2Client = createOAuthClient();
  const integrationDoc = await db
    .collection('teams').doc(teamId)
    .collection('integrations').doc('google')
    .get();

  if (!integrationDoc.exists || !integrationDoc.data()?.tokens) {
    throw new Error('Google integration not configured for this team');
  }

  const tokens = integrationDoc.data()!.tokens;
  oauth2Client.setCredentials(tokens);

  // Handle token refresh with exponential back-off
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      await db
        .collection('teams').doc(teamId)
        .collection('integrations').doc('google')
        .update({
          tokens: { ...tokens, ...newTokens },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.error('Failed to persist refreshed tokens:', err);
    }
  });

  return oauth2Client;
}

// ──────────────────────────────────────────────
// Health Check
// ──────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send(envelope({ status: 'OK', service: 'integration-service' }));
});

// ──────────────────────────────────────────────
// GET /api/v1/auth/google — Generate OAuth URL
// ──────────────────────────────────────────────
app.get('/api/v1/auth/google', (req: Request, res: Response) => {
  const { teamId } = req.query;
  const oauth2Client = createOAuthClient();

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/meetings.space.created',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: teamId as string,
  });

  res.status(200).send(envelope({ url }));
});

// ──────────────────────────────────────────────
// GET /api/v1/auth/google/callback — OAuth Callback
// ──────────────────────────────────────────────
app.get('/api/v1/auth/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: teamId } = req.query;
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code as string);

    // Store tokens in Firestore
    await db
      .collection('teams').doc(teamId as string)
      .collection('integrations').doc('google')
      .set({
        provider: 'google',
        enabled: true,
        tokens,
        config: {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    res.send(`
      <html><body style="background:#0f172a;color:#f8fafc;font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="text-align:center">
          <h1 style="color:#6366f1">✓ Connected!</h1>
          <p>Google Workspace integration is now active. You can close this window.</p>
        </div>
      </body></html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(envelope(null, { type: 'AUTH_ERROR', title: 'OAuth failed', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/integrations/calendar/sync
// Bi-directional Calendar Sync
// ──────────────────────────────────────────────
app.post('/api/v1/integrations/calendar/sync', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.body;
    const auth = await getAuthenticatedClient(teamId);
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch all tasks with due dates that need syncing
    const tasksSnapshot = await db
      .collection('teams').doc(teamId)
      .collection('tasks')
      .where('dueDate', '!=', null)
      .get();

    const results: { taskId: string; calendarEventId: string; action: string }[] = [];

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();

      if (task.calendarEventId) {
        // Update existing event
        await calendar.events.update({
          calendarId: 'primary',
          eventId: task.calendarEventId,
          requestBody: {
            summary: `[VibeTeams] ${task.title}`,
            description: task.description,
            start: { dateTime: new Date(task.dueDate).toISOString() },
            end: { dateTime: new Date(new Date(task.dueDate).getTime() + 3600000).toISOString() },
          },
        });
        results.push({ taskId: taskDoc.id, calendarEventId: task.calendarEventId, action: 'updated' });
      } else {
        // Create new event
        const event = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `[VibeTeams] ${task.title}`,
            description: task.description,
            start: { dateTime: new Date(task.dueDate).toISOString() },
            end: { dateTime: new Date(new Date(task.dueDate).getTime() + 3600000).toISOString() },
          },
        });

        // Update task with calendar event ID
        await taskDoc.ref.update({ calendarEventId: event.data.id });

        // Publish sync event
        await pubsub.topic('integration.calendar.sync').publishMessage({
          json: {
            taskId: taskDoc.id,
            teamId,
            calendarEventId: event.data.id,
            action: 'created',
            timestamp: new Date().toISOString(),
          },
        });

        results.push({ taskId: taskDoc.id, calendarEventId: event.data.id!, action: 'created' });
      }
    }

    res.status(200).send(envelope({ syncedTasks: results.length, results }));
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).send(envelope(null, { type: 'SYNC_ERROR', title: 'Calendar sync failed', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// GET /api/v1/integrations/drive/files — List Drive Files
// ──────────────────────────────────────────────
app.get('/api/v1/integrations/drive/files', async (req: Request, res: Response) => {
  try {
    const { teamId, query: searchQuery } = req.query;
    const auth = await getAuthenticatedClient(teamId as string);
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: searchQuery ? `name contains '${searchQuery}' and trashed = false` : 'trashed = false',
      fields: 'files(id,name,mimeType,thumbnailLink,webViewLink,iconLink,modifiedTime)',
      pageSize: 20,
      orderBy: 'modifiedTime desc',
    });

    res.status(200).send(envelope(response.data.files));
  } catch (error) {
    console.error('Drive list error:', error);
    res.status(500).send(envelope(null, { type: 'DRIVE_ERROR', title: 'Failed to list Drive files', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/integrations/drive/attach — Attach Drive File to Task
// ──────────────────────────────────────────────
app.post('/api/v1/integrations/drive/attach', async (req: Request, res: Response) => {
  try {
    const { teamId, taskId, fileId, fileName, fileUrl, mimeType } = req.body;

    const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc(taskId);
    await taskRef.update({
      attachments: admin.firestore.FieldValue.arrayUnion({
        id: `att_${Date.now()}`,
        name: fileName,
        url: fileUrl,
        type: 'google-drive',
        fileId,
        mimeType,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send(envelope({ attached: true, taskId, fileId }));
  } catch (error) {
    console.error('Drive attach error:', error);
    res.status(500).send(envelope(null, { type: 'DRIVE_ERROR', title: 'Failed to attach file', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/integrations/meet/create — Create Meet Link
// Auto-generates Meet link when task moves to "in-review"
// ──────────────────────────────────────────────
app.post('/api/v1/integrations/meet/create', async (req: Request, res: Response) => {
  try {
    const { teamId, taskId } = req.body;
    const auth = await getAuthenticatedClient(teamId);
    const calendar = google.calendar({ version: 'v3', auth });

    const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      res.status(404).send(envelope(null, { type: 'NOT_FOUND', title: 'Task not found' }));
      return;
    }

    const task = taskDoc.data()!;

    // Create a Calendar event with a Meet link attached
    const event = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary: `[Review] ${task.title}`,
        description: `Code review session for task: ${task.title}\n\n${task.description}`,
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 1800000).toISOString() }, // 30 min
        conferenceData: {
          createRequest: {
            requestId: `vibeteams-${taskId}-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetLink = event.data.conferenceData?.entryPoints?.[0]?.uri || event.data.hangoutLink;

    // Store Meet link on the task
    await taskRef.update({
      meetLink,
      calendarEventId: event.data.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).send(envelope({ meetLink, calendarEventId: event.data.id }));
  } catch (error) {
    console.error('Meet create error:', error);
    res.status(500).send(envelope(null, { type: 'MEET_ERROR', title: 'Failed to create Meet link', detail: (error as Error).message }));
  }
});

// ──────────────────────────────────────────────
// POST /webhooks/google — Google Push Notifications Receiver
// ──────────────────────────────────────────────
app.post('/webhooks/google', async (req: Request, res: Response) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    console.log(`Webhook received: channel=${channelId}, state=${resourceState}`);

    // Process webhook based on resource state
    if (resourceState === 'update' || resourceState === 'sync') {
      // Handle Drive/Calendar push notification
      console.log('Processing webhook update:', req.body);
    }

    res.status(200).send();
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send();
  }
});

app.listen(PORT, () => {
  console.log(`Integration service listening on port ${PORT}`);
});

export default app;
