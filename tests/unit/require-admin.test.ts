import { describe, it, expect, vi, beforeEach } from 'vitest';

// requireAdmin composes getServerSession (next-auth) + validateTeacherEmail.
// We mock those so the guard's three outcomes are testable without a real session.
const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => getServerSession(...args) }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/security', () => ({
  validateTeacherEmail: (email: string) =>
    email.endsWith('@stephensprivelessen.nl')
      ? { success: true, data: email }
      : { success: false, error: new Error('not a teacher') },
}));

import { requireAdmin } from '@/lib/auth';

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects with a 401 response when there is no session', async () => {
    getServerSession.mockResolvedValue(null);
    const auth = await requireAdmin();
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it('rejects with a 401 for a non-teacher email', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'random@gmail.com' } });
    const auth = await requireAdmin();
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  });

  it('allows an authorized teacher and returns the user', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'admin@stephensprivelessen.nl', name: 'Admin' } });
    const auth = await requireAdmin();
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.user.email).toBe('admin@stephensprivelessen.nl');
  });
});
