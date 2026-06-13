import { describe, it, expect, vi } from 'vitest';
import {
  resolveDatalakePathForStudent,
  studentDisplayName,
  type LocationResolverDeps,
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
