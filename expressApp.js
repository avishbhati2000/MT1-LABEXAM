import express from 'express';
import { fileURLToPath } from 'node:url';

const PORT = 4000;
const sampleTasks = [
  {
    id: 1,
    taskName: 'Develop Login Page',
    assignedTo: 'Rahul Sharma',
    status: 'Pending',
    priority: 'High',
  },
  {
    id: 2,
    taskName: 'Create User Dashboard',
    assignedTo: 'Priya Patel',
    status: 'In Progress',
    priority: 'Medium',
  },
  {
    id: 3,
    taskName: 'Write API Documentation',
    assignedTo: 'Amit Kumar',
    status: 'Completed',
    priority: 'Low',
  },
];
const taskFields = ['taskName', 'assignedTo', 'status', 'priority'];

function validateTask(task, { requireId = false } = {}) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return 'Request body must be a JSON object';
  }

  if (requireId && (!Number.isSafeInteger(task.id) || task.id < 1)) {
    return 'id must be a positive integer';
  }

  for (const field of taskFields) {
    if (requireId || Object.hasOwn(task, field)) {
      if (typeof task[field] !== 'string' || !task[field].trim()) {
        return `${field} must be a non-empty string`;
      }
    }
  }

  if (!requireId && !taskFields.some((field) => Object.hasOwn(task, field))) {
    return 'Provide at least one task field to update';
  }

  const allowedFields = new Set(requireId ? ['id', ...taskFields] : taskFields);
  if (Object.keys(task).some((field) => !allowedFields.has(field))) {
    return `Only these fields are allowed: ${[...allowedFields].join(', ')}`;
  }

  return null;
}

export function createExpressApp(initialTasks = sampleTasks) {
  const app = express();
  app.locals.tasks = initialTasks.map((task) => ({ ...task }));
  app.use(express.json({ limit: '1mb' }));
  app.use((request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  });

  app.get('/tasks', (request, response) => {
    response.json(app.locals.tasks);
  });

  app.get('/tasks/:id', (request, response) => {
    const task = app.locals.tasks.find((record) => String(record.id) === request.params.id);
    if (!task) {
      response.status(404).json({ message: 'Task not found' });
      return;
    }

    response.json(task);
  });

  app.post('/tasks', (request, response) => {
    const validationError = validateTask(request.body, { requireId: true });
    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }

    if (app.locals.tasks.some((task) => task.id === request.body.id)) {
      response.status(409).json({ message: `A task with id ${request.body.id} already exists` });
      return;
    }

    const task = Object.fromEntries(
      ['id', ...taskFields].map((field) => [
        field,
        field === 'id' ? request.body[field] : request.body[field].trim(),
      ]),
    );
    app.locals.tasks.push(task);
    response.status(201).json({ message: 'Task added successfully', task });
  });

  app.put('/tasks/:id', (request, response) => {
    const task = app.locals.tasks.find((record) => String(record.id) === request.params.id);
    if (!task) {
      response.status(404).json({ message: 'Task not found' });
      return;
    }

    const validationError = validateTask(request.body);
    if (validationError) {
      response.status(400).json({ message: validationError });
      return;
    }

    Object.assign(
      task,
      Object.fromEntries(
        Object.entries(request.body).map(([field, value]) => [field, value.trim()]),
      ),
    );
    response.json({ message: 'Task updated successfully', task });
  });

  app.delete('/tasks/:id', (request, response) => {
    const taskIndex = app.locals.tasks.findIndex((record) => String(record.id) === request.params.id);
    if (taskIndex === -1) {
      response.status(404).json({ message: 'Task not found' });
      return;
    }

    const [task] = app.locals.tasks.splice(taskIndex, 1);
    response.json({ message: 'Task deleted successfully', task });
  });

  app.use((request, response) => {
    response.status(404).json({ message: 'Route not found' });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const statusCode = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
    if (statusCode === 500) console.error('Express request failed:', error);
    response.status(statusCode).json({
      message: statusCode === 400
        ? 'Request body must contain valid JSON'
        : statusCode === 413
          ? 'Request body is too large'
          : 'Internal server error',
    });
  });

  return app;
}

const app = createExpressApp();
export default app;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = app.listen(PORT, () => {
    console.log(`Express Server running at http://localhost:${PORT}`);
  });
  server.on('error', (error) => {
    console.error('Express Server failed to start:', error);
    process.exitCode = 1;
  });
}
