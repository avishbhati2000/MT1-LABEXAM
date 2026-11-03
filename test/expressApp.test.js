import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createExpressApp } from '../expressApp.js';

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('Express API supports task CRUD and returns JSON errors', async () => {
  await withServer(createExpressApp(), async (baseUrl) => {
    const list = await fetch(`${baseUrl}/tasks`);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).length, 3);

    const detail = await fetch(`${baseUrl}/tasks/1`);
    assert.equal((await detail.json()).taskName, 'Develop Login Page');

    const created = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 4,
        taskName: 'Develop REST API',
        assignedTo: 'Amit Kumar',
        status: 'Pending',
        priority: 'Medium',
      }),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).task.id, 4);

    const duplicate = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 4,
        taskName: 'Duplicate',
        assignedTo: 'Amit Kumar',
        status: 'Pending',
        priority: 'Medium',
      }),
    });
    assert.equal(duplicate.status, 409);

    const updated = await fetch(`${baseUrl}/tasks/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Completed' }),
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).task.status, 'Completed');

    const invalid = await fetch(`${baseUrl}/tasks/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority: '' }),
    });
    assert.equal(invalid.status, 400);

    const deleted = await fetch(`${baseUrl}/tasks/1`, { method: 'DELETE' });
    assert.equal(deleted.status, 200);
    assert.equal((await deleted.json()).task.id, 1);

    const missing = await fetch(`${baseUrl}/tasks/1`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: 'Task not found' });

    const badJson = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(badJson.status, 400);
    assert.equal((await badJson.json()).message, 'Request body must contain valid JSON');

    const unknownRoute = await fetch(`${baseUrl}/unknown`);
    assert.equal(unknownRoute.status, 404);
    assert.deepEqual(await unknownRoute.json(), { message: 'Route not found' });
  });
});
