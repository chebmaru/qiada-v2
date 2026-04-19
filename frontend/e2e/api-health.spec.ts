import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

test.describe('API Health Checks', () => {
  test('backend health endpoint', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
  });

  test('chapters endpoint returns 25', async ({ request }) => {
    const res = await request.get(`${API}/api/chapters`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveLength(25);
  });

  test('questions endpoint returns paginated', async ({ request }) => {
    const res = await request.get(`${API}/api/questions`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.total).toBe(6845);
    expect(body.data).toHaveLength(40);
  });

  test('glossary endpoint returns terms', async ({ request }) => {
    const res = await request.get(`${API}/api/glossary`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.length).toBeGreaterThan(100);
  });
});
