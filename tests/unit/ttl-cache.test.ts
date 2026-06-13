import { describe, it, expect } from 'vitest';
import { TtlCache, hoursToMs } from '@/lib/ttl-cache';

// A controllable clock so expiry is deterministic without fake timers.
function makeClock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe('TtlCache', () => {
  it('stores and returns a value before expiry', () => {
    const clock = makeClock();
    const cache = new TtlCache<number>(1000, clock.now);
    cache.set('a', 42);
    expect(cache.get('a')).toBe(42);
    expect(cache.has('a')).toBe(true);
  });

  it('returns undefined and evicts after the TTL elapses', () => {
    const clock = makeClock();
    const cache = new TtlCache<string>(1000, clock.now);
    cache.set('a', 'x');
    clock.advance(1001);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
    expect(cache.size).toBe(0); // get() evicted it
  });

  it('honours a per-entry TTL override', () => {
    const clock = makeClock();
    const cache = new TtlCache<string>(1000, clock.now);
    cache.set('short', 's', 100);
    cache.set('long', 'l', 5000);
    clock.advance(200);
    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('l');
  });

  it('treats the boundary as not-yet-expired (now === expiresAt)', () => {
    const clock = makeClock();
    const cache = new TtlCache<string>(1000, clock.now);
    cache.set('a', 'x');
    clock.advance(1000); // exactly at expiresAt
    expect(cache.get('a')).toBe('x');
    clock.advance(1);
    expect(cache.get('a')).toBeUndefined();
  });

  it('reports remaining ttl, flooring at 0', () => {
    const clock = makeClock();
    const cache = new TtlCache<string>(1000, clock.now);
    cache.set('a', 'x');
    expect(cache.ttlRemaining('a')).toBe(1000);
    clock.advance(600);
    expect(cache.ttlRemaining('a')).toBe(400);
    clock.advance(1000);
    expect(cache.ttlRemaining('a')).toBe(0);
    expect(cache.ttlRemaining('missing')).toBe(0);
  });

  it('deletes a single key', () => {
    const cache = new TtlCache<number>(1000, makeClock().now);
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    expect(cache.get('a')).toBeUndefined();
  });

  it('invalidates everything when called with no pattern', () => {
    const cache = new TtlCache<number>(1000, makeClock().now);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.invalidate()).toBe(2);
    expect(cache.size).toBe(0);
  });

  it('invalidates only keys matching a substring', () => {
    const cache = new TtlCache<number>(1000, makeClock().now);
    cache.set('student:1:files', 1);
    cache.set('student:1:overview', 2);
    cache.set('student:2:files', 3);
    expect(cache.invalidate('student:1:')).toBe(2);
    expect(cache.get('student:1:files')).toBeUndefined();
    expect(cache.get('student:2:files')).toBe(3);
  });

  it('cleanup() evicts only expired entries', () => {
    const clock = makeClock();
    const cache = new TtlCache<number>(1000, clock.now);
    cache.set('old', 1, 100);
    cache.set('fresh', 2, 5000);
    clock.advance(200);
    expect(cache.cleanup()).toBe(1);
    expect(cache.size).toBe(1);
    expect(cache.get('fresh')).toBe(2);
  });

  it('hoursToMs converts hours to milliseconds', () => {
    expect(hoursToMs(12)).toBe(12 * 60 * 60 * 1000);
    expect(hoursToMs(0.5)).toBe(30 * 60 * 1000);
  });
});
