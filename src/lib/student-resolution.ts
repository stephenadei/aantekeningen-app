/**
 * Student location resolution — see CONTEXT.md ("Student location resolution").
 *
 * Turns a Student into their datalake path. Resolution order:
 *   stored driveFolderId -> stored datalakePath -> one targeted name-lookup
 *   fallback (getStudentPath), bounded by a timeout so it can never hang.
 *
 * This is the single seam the files / overview / share routes previously
 * re-implemented three different ways (one without a timeout, one loading every
 * folder and scanning linearly). Concentrating it here means a fix lands once.
 *
 * The datalake lookup is an injected port (StudentPathLookup) so every branch is
 * unit-testable without S3 or HTTP — the interface is the test surface.
 */

import type { StudentIdType } from '@/lib/types';

/**
 * Minimal Student shape this module needs. Accepts both the `Student` interface
 * (`displayName`) and the raw DB row (`name`) — the long-standing mismatch is
 * reconciled here, in one place, instead of `(student as any).name ||
 * student.displayName` scattered across routes.
 */
export interface StudentLocationInput {
  driveFolderId?: string | null;
  datalakePath?: string | null;
  displayName?: string | null;
  name?: string | null;
  subject?: string | null;
}

/** The datalake name->path lookup. Production impl wraps `datalakeService.getStudentPath`. */
export type StudentPathLookup = (name: string, subject?: string) => Promise<string | null>;

export interface LocationResolverDeps {
  getStudentPath: StudentPathLookup;
  /** Fallback-lookup timeout in ms. Defaults to 10s (the value the files route used). */
  timeoutMs?: number;
}

/**
 * Outcome of location resolution.
 * - `resolved`    — a concrete datalake path was found.
 * - `no-location` — the student exists but has no datalake location yet (no
 *   files). The *route* decides how to render this (files -> empty list,
 *   overview -> empty overview, share -> null path); that is correctly
 *   route-specific and is NOT duplicated here.
 */
export type LocationResult =
  | { kind: 'resolved'; datalakePath: string; studentName?: string }
  | { kind: 'no-location'; studentName?: string };

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Reconcile the student's name across the DB (`name`) / interface (`displayName`)
 * mismatch. Exported for the routes that still need a display name independently.
 */
export function studentDisplayName(student: StudentLocationInput): string | undefined {
  return (student.name ?? student.displayName) ?? undefined;
}

/** Module B. Student -> datalake path, with one timed targeted fallback. */
export async function resolveDatalakePathForStudent(
  student: StudentLocationInput,
  deps: LocationResolverDeps,
): Promise<LocationResult> {
  const studentName = studentDisplayName(student);

  // 1) A stored location wins immediately — no lookup needed.
  const stored = student.driveFolderId || student.datalakePath;
  if (stored) {
    return { kind: 'resolved', datalakePath: stored, studentName };
  }

  // 2) Targeted name-lookup fallback, bounded so it can never hang the request.
  if (studentName) {
    const path = await withTimeout(
      deps.getStudentPath(studentName, student.subject ?? undefined),
      deps.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    ).catch(() => null);
    if (path) {
      return { kind: 'resolved', datalakePath: path, studentName };
    }
  }

  return { kind: 'no-location', studentName };
}

/** Reject after `ms`, but clear the timer once the wrapped promise settles. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('getStudentPath timeout')), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

/* ===========================================================================
 * Student identity resolution — see CONTEXT.md ("Student identity resolution").
 *
 * Turns an inbound id-string (Drive folder ID, Firestore/Prisma student ID, a
 * datalake path, or an auto-detected mix) into a concrete datalake location by
 * composing Module B. The files and overview routes previously inlined this
 * ~150-line block (twice each) plus a tangled second pass that re-looked-up the
 * path. This consolidates it and returns a discriminated outcome each route
 * maps to its own response shape.
 *
 * All ports are injected, so every branch is unit-testable without DB/S3.
 * ======================================================================== */

type Resultish<T> = { success: true; data: T } | { success: false; error: unknown };

interface ResolvedStudentRow {
  displayName?: string | null;
  name?: string | null;
  driveFolderId?: string | null;
  datalakePath?: string | null;
  subject?: string | null;
}

/** Optional Prisma-by-id lookup. When wired (files route), CUID/UUID-like ids are tried here first. */
export type PrismaStudentLookup = (id: string) => Promise<{ name: string; datalakePath: string | null } | null>;

export interface IdentityResolverDeps extends LocationResolverDeps {
  detectIdType: (id: string) => StudentIdType;
  validateFirestoreStudentId: (id: string) => Promise<Resultish<string>>;
  validateDriveFolderId: (id: string) => Promise<Resultish<string>>;
  getStudent: (id: string) => Promise<Resultish<ResolvedStudentRow>>;
  getStudentByDriveFolderId: (id: string) => Promise<Resultish<ResolvedStudentRow>>;
  findPrismaStudentById?: PrismaStudentLookup;
}

/**
 * Resolution outcome. Routes map each variant to their own HTTP shape:
 * - resolved   -> proceed with datalakePath (200)
 * - no-files   -> student exists, no datalake location (route renders empty, 200)
 * - no-notes   -> Prisma student with no datalakePath yet (route renders empty, 200)
 * - not-found  -> student/folder not found (404)
 * - invalid    -> malformed id (400)
 */
export type StudentResolution =
  | { kind: 'resolved'; datalakePath: string; studentName?: string; idType: StudentIdType }
  | { kind: 'no-files'; studentName?: string }
  | { kind: 'no-notes'; studentName?: string }
  | { kind: 'not-found'; message: string }
  | { kind: 'invalid'; error: unknown };

const PRISMA_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const looksLikePrismaId = (id: string): boolean =>
  !id.includes('/') && (id.length >= 20 || PRISMA_ID_RE.test(id));

const lastPathSegment = (path: string): string | undefined =>
  path.split('/').filter(Boolean).pop();

/** Module A. id-string -> concrete datalake location (composes Module B). */
export async function resolveStudentRequest(
  idString: string,
  idTypeHint: StudentIdType | null,
  deps: IdentityResolverDeps,
): Promise<StudentResolution> {
  if (!idString) return { kind: 'invalid', error: new Error('empty student id') };

  if (idTypeHint === 'drive') {
    return resolveDriveId(idString, deps, 'drive');
  }
  if (idTypeHint === 'firestore') {
    return resolveFirestoreId(idString, deps, 'firestore');
  }

  let detected: StudentIdType;
  try {
    detected = deps.detectIdType(idString);
  } catch (error) {
    return { kind: 'invalid', error };
  }

  if (detected === 'firestore') {
    // CUID/UUID-like ids often detect as firestore; when a Prisma lookup is
    // wired, try it first (it owns the canonical name -> datalakePath mapping).
    if (deps.findPrismaStudentById && looksLikePrismaId(idString)) {
      const viaPrisma = await tryPrisma(idString, deps);
      if (viaPrisma) return viaPrisma;
    }
    return resolveFirestoreId(idString, deps, detected);
  }

  // Auto-detected non-firestore: a datalake path or a legacy Drive folder ID.
  if (idString.includes('/')) {
    let studentName = lastPathSegment(idString);
    const byDrive = await safeCall(() => deps.getStudentByDriveFolderId(idString));
    if (byDrive?.success && byDrive.data.displayName) studentName = byDrive.data.displayName;
    return { kind: 'resolved', datalakePath: idString, studentName, idType: detected };
  }
  return resolveDriveId(idString, deps, detected);
}

async function resolveFirestoreId(
  idString: string,
  deps: IdentityResolverDeps,
  idType: StudentIdType,
): Promise<StudentResolution> {
  const valid = await deps.validateFirestoreStudentId(idString);
  if (!valid.success) return { kind: 'invalid', error: valid.error };

  const studentResult = await deps.getStudent(valid.data);
  if (!studentResult.success) return { kind: 'not-found', message: 'Student not found' };

  const student = studentResult.data;
  const location = await resolveDatalakePathForStudent(student, deps);
  if (location.kind === 'no-location') {
    return { kind: 'no-files', studentName: location.studentName };
  }
  return { kind: 'resolved', datalakePath: location.datalakePath, studentName: location.studentName, idType };
}

/** A bare Drive folder ID (no slash) needs a datalake path resolved from the student's name. */
async function resolveDriveId(
  idString: string,
  deps: IdentityResolverDeps,
  idType: StudentIdType,
): Promise<StudentResolution> {
  const valid = await deps.validateDriveFolderId(idString);
  if (!valid.success) return { kind: 'invalid', error: valid.error };

  const byDrive = await safeCall(() => deps.getStudentByDriveFolderId(valid.data));
  const studentName = byDrive?.success ? (byDrive.data.displayName ?? undefined) : undefined;

  // A drive id that is actually a path resolves directly.
  if (valid.data.includes('/')) {
    return { kind: 'resolved', datalakePath: valid.data, studentName: studentName ?? lastPathSegment(valid.data), idType };
  }
  if (!studentName) {
    return { kind: 'invalid', error: new Error(`cannot resolve a datalake path for drive id ${idString}`) };
  }
  const path = await withTimeout(deps.getStudentPath(studentName), deps.timeoutMs ?? 10_000).catch(() => null);
  if (!path) return { kind: 'not-found', message: `Student folder not found: ${studentName}` };
  return { kind: 'resolved', datalakePath: path, studentName, idType };
}

async function tryPrisma(idString: string, deps: IdentityResolverDeps): Promise<StudentResolution | null> {
  const row = await safeCall(() => deps.findPrismaStudentById!(idString));
  if (!row) return null;
  if (!row.datalakePath) return { kind: 'no-notes', studentName: row.name };
  return { kind: 'resolved', datalakePath: row.datalakePath, studentName: row.name, idType: 'firestore' };
}

/** Run a thunk, swallowing rejections to null (DB lookups are best-effort for metadata). */
async function safeCall<T>(thunk: () => Promise<T>): Promise<T | null> {
  try {
    return await thunk();
  } catch {
    return null;
  }
}
