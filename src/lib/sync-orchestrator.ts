/**
 * Sync Orchestrator — one entry point for the datalake sync flows.
 *
 * Two flows exist:
 *
 *  - syncAll():   reconcile student records from the datalake FIRST
 *                 (`runFullDatalakeSync`), THEN sync each student's files
 *                 (file-metadata sync). The ordering is load-bearing — the
 *                 file sync resolves students the datalake sync may have just
 *                 created, so students must run first. Used by the folder cron.
 *
 *  - syncFiles(): file-metadata sync only (student records assumed current).
 *                 Used by the cache cron and the manual/admin triggers.
 *
 * This ordering previously lived inline in the folder-cron route while every
 * other route reached into `backgroundSyncService` directly. Centralising it
 * gives the "students-before-files" invariant a name and a test, and makes the
 * routes declare intent (`syncAll` vs `syncFiles`) rather than wiring steps.
 *
 * The flows are injected so the orchestration can be unit-tested without
 * touching MinIO; the default instance wires the real sync services.
 */
import { runFullDatalakeSync } from './datalake-sync';
import { backgroundSyncService } from './background-sync';

type DatalakeSyncResult = Awaited<ReturnType<typeof runFullDatalakeSync>>;

export interface SyncOrchestratorDeps {
  /** Reconcile student records from the datalake (create/update + calendar). */
  syncStudents: () => Promise<DatalakeSyncResult>;
  /** Sync each student's file metadata (AI analysis, thumbnails, note rows). */
  syncFiles: () => Promise<void>;
}

export class SyncOrchestrator {
  constructor(private readonly deps: SyncOrchestratorDeps) {}

  /**
   * Students-then-files. Returns the student-sync report so callers can surface
   * its counts. If the student sync throws, the file sync is not run (the error
   * propagates to the caller) — identical to the previous sequential awaits.
   */
  async syncAll(): Promise<DatalakeSyncResult> {
    const students = await this.deps.syncStudents();
    await this.deps.syncFiles();
    return students;
  }

  /** File-metadata sync only. */
  async syncFiles(): Promise<void> {
    await this.deps.syncFiles();
  }
}

export const syncOrchestrator = new SyncOrchestrator({
  syncStudents: () => runFullDatalakeSync(),
  syncFiles: () => backgroundSyncService.runFullSync(),
});
