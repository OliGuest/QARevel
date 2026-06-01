import { generateErrorHash, deduplicateErrors } from './error-fingerprint';

describe('generateErrorHash', () => {
  it('produces a stable 16-char hex hash', () => {
    const h = generateErrorHash('Something broke');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(generateErrorHash('Something broke')).toBe(h); // deterministic
  });

  it('normalizes embedded numbers so similar errors collapse', () => {
    // Different array indices / counts should hash the same.
    expect(generateErrorHash('Cannot read index 42')).toBe(
      generateErrorHash('Cannot read index 7'),
    );
  });

  it('normalizes hex ids and URLs', () => {
    expect(generateErrorHash('Failed req to https://api.example.com/users')).toBe(
      generateErrorHash('Failed req to https://other.host/abc'),
    );
    // Long hex ids (>=8 chars) collapse to the same fingerprint.
    expect(generateErrorHash('Bad token deadbeefcafe')).toBe(
      generateErrorHash('Bad token abcdefabcdef'),
    );
  });

  it('distinguishes genuinely different messages', () => {
    expect(generateErrorHash('TypeError: x is undefined')).not.toBe(
      generateErrorHash('ReferenceError: y is not defined'),
    );
  });

  it('ignores line:col churn in stack frames', () => {
    const stackA = 'Error\n  at foo (app.js:10:5)\n  at bar (app.js:20:9)';
    const stackB = 'Error\n  at foo (app.js:11:7)\n  at bar (app.js:99:1)';
    expect(generateErrorHash('boom', undefined, stackA)).toBe(
      generateErrorHash('boom', undefined, stackB),
    );
  });
});

describe('deduplicateErrors', () => {
  const mk = (text: string, timestamp: number, url = 'https://app/x') => ({
    level: 'error',
    text,
    timestamp,
    url,
  });

  it('groups duplicates and counts occurrences', () => {
    const result = deduplicateErrors([
      mk('Cannot read index 1', 100),
      mk('Cannot read index 2', 200),
      mk('Cannot read index 3', 300),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe(3);
  });

  it('tracks firstSeen / lastSeen across occurrences regardless of order', () => {
    const result = deduplicateErrors([
      mk('boom 1', 300),
      mk('boom 2', 100),
      mk('boom 3', 200),
    ]);
    expect(result[0].firstSeen).toBe(100);
    expect(result[0].lastSeen).toBe(300);
  });

  it('keeps distinct errors separate and sorts by count desc', () => {
    const result = deduplicateErrors([
      mk('TypeError happened', 1),
      mk('TypeError happened', 2),
      mk('NetworkError happened', 3),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2); // most frequent first
    expect(result[1].count).toBe(1);
  });

  it('returns an empty array for no input', () => {
    expect(deduplicateErrors([])).toEqual([]);
  });
});
