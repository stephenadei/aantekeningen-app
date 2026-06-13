import { describe, it, expect, vi } from 'vitest';
import {
  resolveDatalakePathForStudent,
  resolveStudentRequest,
  studentDisplayName,
  type LocationResolverDeps,
  type IdentityResolverDeps,
} from '@/lib/student-resolution';

/**
 * Module B (Student location resolution) is testable through its interface
 * because the datalake name->path lookup is an injected port. No S3, no HTTP.
 * These cover every branch the three routes previously re-implemented (and
 * diverged on): stored id, stored path, targeted fallback, miss, timeout.
 */

const lookupReturning = (value: string | null) => vi.fn(async () => value);

describe('resolveDatalakePathForStudent (Module B)', () => {
  it('uses a stored driveFolderId without calling the lookup', async () => {
    const getStudentPath = lookupReturning('should/not/be/used');
    const result = await resolveDatalakePathForStudent(
      { driveFolderId: 'notability/Priveles/VO/Teresa', displayName: 'Teresa' },
      { getStudentPath },
    );
    expect(result).toEqual({
      kind: 'resolved',
      datalakePath: 'notability/Priveles/VO/Teresa',
      studentName: 'Teresa',
    });
    expect(getStudentPath).not.toHaveBeenCalled();
  });

  it('falls back to a stored datalakePath when no driveFolderId', async () => {
    const getStudentPath = lookupReturning(null);
    const result = await resolveDatalakePathForStudent(
      { datalakePath: 'notability/Priveles/PO/Sam', displayName: 'Sam' },
      { getStudentPath },
    );
    expect(result).toMatchObject({ kind: 'resolved', datalakePath: 'notability/Priveles/PO/Sam' });
    expect(getStudentPath).not.toHaveBeenCalled();
  });

  it('prefers driveFolderId over datalakePath', async () => {
    const result = await resolveDatalakePathForStudent(
      { driveFolderId: 'drive/path', datalakePath: 'datalake/path', displayName: 'X' },
      { getStudentPath: lookupReturning(null) },
    );
    expect(result).toMatchObject({ kind: 'resolved', datalakePath: 'drive/path' });
  });

  it('does the targeted name-lookup fallback when no stored location, passing the subject', async () => {
    const getStudentPath = lookupReturning('notability/Priveles/VO/Noor');
    const result = await resolveDatalakePathForStudent(
      { displayName: 'Noor', subject: 'wiskunde' },
      { getStudentPath },
    );
    expect(result).toEqual({
      kind: 'resolved',
      datalakePath: 'notability/Priveles/VO/Noor',
      studentName: 'Noor',
    });
    expect(getStudentPath).toHaveBeenCalledWith('Noor', 'wiskunde');
  });

  it('returns no-location when the fallback lookup finds nothing', async () => {
    const result = await resolveDatalakePathForStudent(
      { displayName: 'Ghost' },
      { getStudentPath: lookupReturning(null) },
    );
    expect(result).toEqual({ kind: 'no-location', studentName: 'Ghost' });
  });

  it('returns no-location and never calls the lookup when there is no name', async () => {
    const getStudentPath = lookupReturning('x');
    const result = await resolveDatalakePathForStudent({}, { getStudentPath });
    expect(result).toEqual({ kind: 'no-location', studentName: undefined });
    expect(getStudentPath).not.toHaveBeenCalled();
  });

  it('reconciles the DB `name` / interface `displayName` mismatch (name wins)', async () => {
    const result = await resolveDatalakePathForStudent(
      { name: 'DbName', displayName: 'InterfaceName', driveFolderId: 'p' },
      { getStudentPath: lookupReturning(null) },
    );
    expect(result).toMatchObject({ studentName: 'DbName' });
  });

  it('falls back to displayName when `name` is absent', async () => {
    const result = await resolveDatalakePathForStudent(
      { displayName: 'OnlyDisplay', driveFolderId: 'p' },
      { getStudentPath: lookupReturning(null) },
    );
    expect(result).toMatchObject({ studentName: 'OnlyDisplay' });
  });

  it('times out a hanging lookup instead of hanging the request', async () => {
    const hangingDeps: LocationResolverDeps = {
      getStudentPath: () => new Promise<string | null>(() => {}), // never resolves
      timeoutMs: 10,
    };
    const result = await resolveDatalakePathForStudent({ displayName: 'Slow' }, hangingDeps);
    expect(result).toEqual({ kind: 'no-location', studentName: 'Slow' });
  });
});

describe('studentDisplayName', () => {
  it('prefers name over displayName, falls back, and yields undefined when neither', () => {
    expect(studentDisplayName({ name: 'A', displayName: 'B' })).toBe('A');
    expect(studentDisplayName({ displayName: 'B' })).toBe('B');
    expect(studentDisplayName({})).toBeUndefined();
  });
});

const ok = <T>(data: T) => ({ success: true as const, data });
const err = (e: unknown) => ({ success: false as const, error: e });

function makeIdentityDeps(over: Partial<IdentityResolverDeps> = {}): IdentityResolverDeps {
  return {
    getStudentPath: vi.fn(async () => null),
    detectIdType: vi.fn(() => 'firestore'),
    validateFirestoreStudentId: vi.fn(async (id: string) => ok(id)),
    validateDriveFolderId: vi.fn(async (id: string) => ok(id)),
    getStudent: vi.fn(async () => err(new Error('not found'))),
    getStudentByDriveFolderId: vi.fn(async () => err(new Error('not found'))),
    ...over,
  };
}

describe('resolveStudentRequest (Module A)', () => {
  it('rejects an empty id as invalid', async () => {
    const result = await resolveStudentRequest('', null, makeIdentityDeps());
    expect(result.kind).toBe('invalid');
  });

  it('explicit firestore: resolves via a stored datalakePath', async () => {
    const deps = makeIdentityDeps({
      getStudent: vi.fn(async () => ok({ displayName: 'Teresa', datalakePath: 'notability/Priveles/VO/Teresa' })),
    });
    const result = await resolveStudentRequest('stud-1', 'firestore', deps);
    expect(result).toEqual({ kind: 'resolved', datalakePath: 'notability/Priveles/VO/Teresa', studentName: 'Teresa', idType: 'firestore' });
  });

  it('explicit firestore: no stored location, name-lookup hit -> resolved', async () => {
    const deps = makeIdentityDeps({
      getStudent: vi.fn(async () => ok({ displayName: 'Noor', subject: 'wiskunde' })),
      getStudentPath: vi.fn(async () => 'notability/Priveles/VO/Noor'),
    });
    const result = await resolveStudentRequest('stud-2', 'firestore', deps);
    expect(result).toMatchObject({ kind: 'resolved', datalakePath: 'notability/Priveles/VO/Noor', studentName: 'Noor' });
  });

  it('explicit firestore: no stored, lookup miss -> no-files', async () => {
    const deps = makeIdentityDeps({ getStudent: vi.fn(async () => ok({ displayName: 'Ghost' })) });
    const result = await resolveStudentRequest('stud-3', 'firestore', deps);
    expect(result).toEqual({ kind: 'no-files', studentName: 'Ghost' });
  });

  it('explicit firestore: student not found -> not-found', async () => {
    const result = await resolveStudentRequest('missing', 'firestore', makeIdentityDeps());
    expect(result.kind).toBe('not-found');
  });

  it('explicit firestore: invalid id -> invalid', async () => {
    const deps = makeIdentityDeps({ validateFirestoreStudentId: vi.fn(async () => err(new Error('bad'))) });
    const result = await resolveStudentRequest('!!', 'firestore', deps);
    expect(result.kind).toBe('invalid');
  });

  it('auto-detect datalake path: resolves directly, name from path', async () => {
    const deps = makeIdentityDeps({ detectIdType: vi.fn(() => 'drive') });
    const result = await resolveStudentRequest('notability/Priveles/PO/Sam', null, deps);
    expect(result).toMatchObject({ kind: 'resolved', datalakePath: 'notability/Priveles/PO/Sam', studentName: 'Sam' });
  });

  it('auto-detect bare drive id: name-lookup hit -> resolved', async () => {
    const deps = makeIdentityDeps({
      detectIdType: vi.fn(() => 'drive'),
      getStudentByDriveFolderId: vi.fn(async () => ok({ displayName: 'Eva' })),
      getStudentPath: vi.fn(async () => 'notability/Priveles/VO/Eva'),
    });
    const result = await resolveStudentRequest('drivefolder123', null, deps);
    expect(result).toMatchObject({ kind: 'resolved', datalakePath: 'notability/Priveles/VO/Eva', studentName: 'Eva' });
  });

  it('auto-detect bare drive id: no resolvable name -> invalid', async () => {
    const deps = makeIdentityDeps({ detectIdType: vi.fn(() => 'drive') });
    const result = await resolveStudentRequest('drivefolder123', null, deps);
    expect(result.kind).toBe('invalid');
  });

  it('Prisma-id (wired): found with a datalakePath -> resolved', async () => {
    const deps = makeIdentityDeps({
      findPrismaStudentById: vi.fn(async () => ({ name: 'Lola', datalakePath: 'notability/Priveles/VO/Lola' })),
    });
    const result = await resolveStudentRequest('clx0123456789abcdefghij', null, deps);
    expect(result).toEqual({ kind: 'resolved', datalakePath: 'notability/Priveles/VO/Lola', studentName: 'Lola', idType: 'firestore' });
  });

  it('Prisma-id (wired): found without a datalakePath -> no-notes', async () => {
    const deps = makeIdentityDeps({
      findPrismaStudentById: vi.fn(async () => ({ name: 'Lola', datalakePath: null })),
    });
    const result = await resolveStudentRequest('clx0123456789abcdefghij', null, deps);
    expect(result).toEqual({ kind: 'no-notes', studentName: 'Lola' });
  });

  it('Prisma-id (wired): not in Prisma -> falls through to firestore lookup', async () => {
    const getStudent = vi.fn(async () => ok({ displayName: 'Fallback', datalakePath: 'notability/Priveles/VO/Fallback' }));
    const deps = makeIdentityDeps({
      findPrismaStudentById: vi.fn(async () => null),
      getStudent,
    });
    const result = await resolveStudentRequest('clx0123456789abcdefghij', null, deps);
    expect(result).toMatchObject({ kind: 'resolved', datalakePath: 'notability/Priveles/VO/Fallback' });
    expect(getStudent).toHaveBeenCalled();
  });

  it('detectIdType throwing yields invalid', async () => {
    const deps = makeIdentityDeps({ detectIdType: vi.fn(() => { throw new Error('boom'); }) });
    const result = await resolveStudentRequest('weird', null, deps);
    expect(result.kind).toBe('invalid');
  });
});
