'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app      = require('../src/app');

// Use in-memory test DB or a test URI
const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/taskquest_test';

let accessToken;
let taskId;

beforeAll(async () => {
  process.env.JWT_SECRET         = 'test_jwt_secret_key_xxxxxxx';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_xx';
  await mongoose.connect(TEST_DB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── Health ───────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
describe('Auth', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      username:    'testuser',
      displayName: 'Test User',
      email:       'test@example.com',
      password:    'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      username:    'another',
      displayName: 'Another',
      email:       'test@example.com',
      password:    'password123',
    });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email:    'test@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email:    'test@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('GET /me returns profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
  });
});

// ─── Tasks ────────────────────────────────────────────────────────────────────
describe('Tasks', () => {
  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('creates a task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set(auth())
      .send({ title: 'Test Task', priority: 'high', category: 'work', complexity: 3 });
    expect(res.status).toBe(201);
    expect(res.body.data.task.title).toBe('Test Task');
    taskId = res.body.data.task._id;
  });

  it('lists tasks', async () => {
    const res = await request(app).get('/api/v1/tasks').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.tasks)).toBe(true);
  });

  it('gets a single task', async () => {
    const res = await request(app).get(`/api/v1/tasks/${taskId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.task._id).toBe(taskId);
  });

  it('updates a task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set(auth())
      .send({ title: 'Updated Task' });
    expect(res.status).toBe(200);
    expect(res.body.data.task.title).toBe('Updated Task');
  });

  it('completes a task and returns gamification data', async () => {
    const res = await request(app).patch(`/api/v1/tasks/${taskId}/complete`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.gamification.score).toBeGreaterThan(0);
  });

  it('rejects completing an already-completed task', async () => {
    const res = await request(app).patch(`/api/v1/tasks/${taskId}/complete`).set(auth());
    expect(res.status).toBe(400);
  });

  it('un-completes a task', async () => {
    const res = await request(app).patch(`/api/v1/tasks/${taskId}/uncomplete`).set(auth());
    expect(res.status).toBe(200);
  });

  it('deletes a task', async () => {
    const res = await request(app).delete(`/api/v1/tasks/${taskId}`).set(auth());
    expect(res.status).toBe(200);
  });
});

// ─── Gamification ─────────────────────────────────────────────────────────────
describe('Gamification', () => {
  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('returns gamification profile', async () => {
    const res = await request(app).get('/api/v1/gamification').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.gamification).toBeDefined();
  });

  it('returns weekly activity', async () => {
    const res = await request(app).get('/api/v1/gamification/weekly').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.weekly.length).toBe(7);
  });

  it('returns achievements list', async () => {
    const res = await request(app).get('/api/v1/gamification/achievements').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.achievements)).toBe(true);
  });
});
