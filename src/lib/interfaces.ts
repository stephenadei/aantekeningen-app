/**
 * Centralized interface definitions - Re-exports from domain-specific type files
 * 
 * This file maintains backward compatibility by re-exporting all types.
 * New code should import directly from the type files in src/types/
 */

// Re-export all types from domain-specific files
export * from '@/types/student';
export * from '@/types/file';
export * from '@/types/filter';
export * from '@/types/api';
export * from '@/types/auth';
export * from '@/types/cache';
export * from '@/types/ui';
export * from '@/types/admin';
