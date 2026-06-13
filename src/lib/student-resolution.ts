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
