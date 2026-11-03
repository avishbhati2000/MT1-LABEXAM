import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createHttpServer } from '../httpServer.js';

async function withServer(server, run) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('HTTP server serves required GET routes and static HTML', async () => {
  await withServer(createHttpServer(), async (baseUrl) => {
    const welcome = await fetch(`${baseUrl}/`);
    assert.equal(welcome.status, 200);
    assert.match(welcome.headers.get('content-type'), /text\/html/);
    assert.match(await welcome.text(), /Welcome to Employee Task Management/);

    const tasks = await fetch(`${baseUrl}/tasks`);
    assert.equal(tasks.status, 200);
    assert.equal(tasks.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal((await tasks.json()).length, 3);

    const about = await fetch(`${baseUrl}/about`);
    assert.match(await about.text(), /Employee Task Management/);

    const home = await fetch(`${baseUrl}/home`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /text\/html/);
    assert.match(await home.text(), /Employee tasks/);

    const missing = await fetch(`${baseUrl}/missing`);
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { message: 'Route not found' });
  });
});

test('HTTP server validates and adds task records', async () => {
  await withServer(createHttpServer([]), async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/add-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, taskName: 'Incomplete' }),
    });
    assert.equal(invalid.status, 400);

    const unsupported = await fetch(`${baseUrl}/add-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    assert.equal(unsupported.status, 415);

    const malformed = await fetch(`${baseUrl}/add-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { message: 'Request body must contain valid JSON' });

    const created = await fetch(`${baseUrl}/add-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        taskName: 'Develop REST API',
        assignedTo: 'Amit Kumar',
        status: 'Pending',
      }),
    });
    assert.equal(created.status, 201);
    assert.deepEqual((await created.json()).task, {
      id: 1,
      taskName: 'Develop REST API',
      assignedTo: 'Amit Kumar',
      status: 'Pending',
    });

    const duplicate = await fetch(`${baseUrl}/add-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        taskName: 'Duplicate',
        assignedTo: 'Amit Kumar',
        status: 'Pending',
      }),
    });
    assert.equal(duplicate.status, 400);
    assert.equal((await fetch(`${baseUrl}/tasks`)).status, 200);
  });
});
