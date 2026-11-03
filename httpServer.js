import { createServer } from 'node:http';
import { readFile } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const INDEX_PATH = fileURLToPath(new URL('./public/index.html', import.meta.url));
const MAX_BODY_SIZE = 1024 * 1024;
const initialTasks = [
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

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, contentType, content) {
  response.writeHead(statusCode, { 'Content-Type': contentType });
  response.end(content);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        settled = true;
        reject(Object.assign(new Error('Request body is too large'), { statusCode: 413 }));
        request.resume();
        return;
      }

      if (!settled) chunks.push(chunk);
    });

    request.on('end', () => {
      if (settled) return;

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Request body must contain valid JSON'), { statusCode: 400 }));
      }
    });

    request.on('error', (error) => {
      if (!settled) reject(error);
    });
  });
}

function validateTask(task, tasks) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) {
    return 'Request body must be a JSON object';
  }

  if (!Number.isSafeInteger(task.id) || task.id < 1) {
    return 'id must be a positive integer';
  }

  for (const field of ['taskName', 'assignedTo', 'status']) {
    if (typeof task[field] !== 'string' || !task[field].trim()) {
      return `${field} must be a non-empty string`;
    }
  }

  if (tasks.some((existingTask) => existingTask.id === task.id)) {
    return `A task with id ${task.id} already exists`;
  }

  return null;
}

function readHomePage(response) {
  readFile(INDEX_PATH, 'utf8', (error, html) => {
    if (error) {
      console.error('Unable to read public/index.html:', error);
      sendText(response, 500, 'text/plain; charset=utf-8', 'Unable to load the home page');
      return;
    }

    sendText(response, 200, 'text/html; charset=utf-8', html);
  });
}

export function createHttpServer(taskRecords = initialTasks) {
  const tasks = taskRecords.map((task) => ({ ...task }));

  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (request.method === 'GET' && pathname === '/') {
      sendText(
        response,
        200,
        'text/html; charset=utf-8',
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Employee Task Management</title></head><body><h1>Welcome to Employee Task Management</h1><p>Visit <a href="/home">the task manager</a> to view the application.</p></body></html>',
      );
      return;
    }

    if (request.method === 'GET' && pathname === '/tasks') {
      sendJson(response, 200, tasks);
      return;
    }

    if (request.method === 'GET' && pathname === '/about') {
      sendText(
        response,
        200,
        'text/html; charset=utf-8',
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>About</title></head><body><h1>About this application</h1><p>Employee Task Management helps teams assign, track, and update work. The project demonstrates Node.js HTTP and FS modules and an Express REST API.</p><p><a href="/home">Open the task manager</a></p></body></html>',
      );
      return;
    }

    if (request.method === 'GET' && pathname === '/home') {
      readHomePage(response);
      return;
    }

    if (request.method === 'POST' && pathname === '/add-task') {
      const contentType = request.headers['content-type']?.split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/json') {
        sendJson(response, 415, { message: 'Content-Type must be application/json' });
        return;
      }

      try {
        const task = await readJsonBody(request);
        const validationError = validateTask(task, tasks);
        if (validationError) {
          sendJson(response, 400, { message: validationError });
          return;
        }

        const newTask = {
          ...task,
          taskName: task.taskName.trim(),
          assignedTo: task.assignedTo.trim(),
          status: task.status.trim(),
        };
        tasks.push(newTask);
        sendJson(response, 201, { message: 'Task added successfully', task: newTask });
      } catch (error) {
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        if (statusCode === 500) console.error('Unable to process task request:', error);
        sendJson(response, statusCode, { message: error.message || 'Unable to process request' });
      }
      return;
    }

    if (['/', '/tasks', '/about', '/home', '/add-task'].includes(pathname)) {
      response.setHeader('Allow', pathname === '/add-task' ? 'POST' : 'GET');
      sendJson(response, 405, { message: 'Method not allowed' });
      return;
    }

    sendJson(response, 404, { message: 'Route not found' });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const server = createHttpServer();
  server.on('error', (error) => {
    console.error('HTTP Server failed to start:', error);
    process.exitCode = 1;
  });
  server.listen(PORT, () => {
    console.log(`HTTP Server running at http://localhost:${PORT}`);
  });
}
