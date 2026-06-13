import { describe, it, expect, vi } from 'vitest';
import { SyncOrchestrator } from '@/lib/sync-orchestrator';

// Minimal stand-in for the runFullDatalakeSync report shape.
const fakeReport = {
  students: { scanned: 1, created: 0, updated: 1, errors: [], unmatched: [] },
  calendar: { scanned: 0, found: 0, linked: 0, errors: [] },
} as unknown as Awaited<ReturnType<typeof import('@/lib/datalake-sync').runFullDatalakeSync>>;

describe('SyncOrchestrator', () => {
  it('syncAll runs students before files and returns the student report', async () => {
    const order: string[] = [];
    const syncStudents = vi.fn(async () => {
      order.push('students');
      return fakeReport;
    });
    const syncFiles = vi.fn(async () => {
      order.push('files');
    });
    const orch = new SyncOrchestrator({ syncStudents, syncFiles });

    const result = await orch.syncAll();

    expect(order).toEqual(['students', 'files']); // ordering is load-bearing
    expect(result).toBe(fakeReport);
    expect(syncStudents).toHaveBeenCalledOnce();
    expect(syncFiles).toHaveBeenCalledOnce();
  });

  it('syncAll does not run the file sync if the student sync throws', async () => {
    const syncStudents = vi.fn(async () => {
      throw new Error('boom');
    });
    const syncFiles = vi.fn(async () => {});
    const orch = new SyncOrchestrator({ syncStudents, syncFiles });

    await expect(orch.syncAll()).rejects.toThrow('boom');
    expect(syncFiles).not.toHaveBeenCalled();
  });

  it('syncFiles runs only the file sync', async () => {
    const syncStudents = vi.fn(async () => fakeReport);
    const syncFiles = vi.fn(async () => {});
    const orch = new SyncOrchestrator({ syncStudents, syncFiles });

    await orch.syncFiles();

    expect(syncStudents).not.toHaveBeenCalled();
    expect(syncFiles).toHaveBeenCalledOnce();
  });
});
