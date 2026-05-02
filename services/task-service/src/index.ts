import express from 'express';
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

// Task validation schema
const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  status: z.enum(['backlog', 'in-progress', 'in-review', 'done', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  teamId: z.string(),
  projectId: z.string(),
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'OK' });
});

// Create task
app.post('/api/v1/teams/:teamId/tasks', async (req, res) => {
  try {
    const { teamId } = req.params;
    const validatedData = TaskSchema.parse(req.body);
    
    const taskRef = db.collection('teams').doc(teamId).collection('tasks').doc();
    const task = {
      ...validatedData,
      id: taskRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await taskRef.set(task);

    // Publish event
    const topic = pubsub.topic('task.assigned');
    await topic.publishMessage({ json: task });

    res.status(201).send({ data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).send({ error: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`Task service listening on port ${PORT}`);
});
