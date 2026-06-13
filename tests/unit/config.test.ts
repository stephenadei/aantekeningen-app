import { describe, it, expect, afterEach } from 'vitest';
import { config, validateConfig } from '@/lib/config';

// config getters read process.env live, so we mutate + restore around each test.
describe('config', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('cache.durationHours defaults to 12 (the canonical value) when unset', () => {
    delete process.env.CACHE_DURATION_HOURS;
    expect(config.features.cache.durationHours).toBe(12);
  });

  it('cache.durationHours reads CACHE_DURATION_HOURS when set', () => {
    process.env.CACHE_DURATION_HOURS = '6';
    expect(config.features.cache.durationHours).toBe(6);
  });

  it('security exposes the teacher domain/email with defaults', () => {
    delete process.env.ALLOWED_TEACHER_DOMAIN;
    delete process.env.TEACHER_EMAIL;
    expect(config.security.allowedTeacherDomain).toBe('stephensprivelessen.nl');
    expect(config.security.teacherEmail).toBe('lessons@stephensprivelessen.nl');
  });

  it('security reads the env overrides when set', () => {
    process.env.ALLOWED_TEACHER_DOMAIN = 'example.com';
    process.env.TEACHER_EMAIL = 'teacher@example.com';
    expect(config.security.allowedTeacherDomain).toBe('example.com');
    expect(config.security.teacherEmail).toBe('teacher@example.com');
  });

  it('validateConfig fails when required env is missing', () => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.DATABASE_URL;
    expect(validateConfig()).toBe(false);
  });

  it('validateConfig passes when required env is present', () => {
    process.env.NEXTAUTH_SECRET = 'secret';
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    expect(validateConfig()).toBe(true);
  });
});
