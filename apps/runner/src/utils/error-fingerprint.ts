import { createHash } from 'crypto';

/**
 * Error fingerprinting utility.
 * Groups duplicate errors by hashing their stack traces and messages
 * so we can track occurrence count and first/last seen.
 */

export interface ErrorFingerprint {
  hash: string;
  message: string;
  source: string; // URL where error occurred
  count: number;
  firstSeen: number;
  lastSeen: number;
  level: string;
}

/**
 * Generate a stable fingerprint hash for an error.
 * Strips line numbers and dynamic content to group similar errors.
 */
export function generateErrorHash(message: string, source?: string, stack?: string): string {
  // Normalize the error message - strip numbers, dynamic IDs, timestamps
  const normalizedMessage = message
    .replace(/\d+/g, 'N') // Replace all numbers with N
    .replace(/[0-9a-f]{8,}/gi, 'HASH') // Replace hex strings (IDs, hashes)
    .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
    .trim();

  // If we have a stack trace, use the first meaningful frame
  let normalizedStack = '';
  if (stack) {
    const frames = stack.split('\n').slice(0, 3); // First 3 stack frames
    normalizedStack = frames
      .map((f) => f.replace(/:\d+:\d+/g, ':N:N').trim()) // Strip line:col numbers
      .join('|');
  }

  const input = `${normalizedMessage}::${normalizedStack}`;
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * Deduplicate a list of console errors by fingerprint.
 * Returns grouped errors with occurrence count.
 */
export function deduplicateErrors(
  errors: { level: string; text: string; timestamp: number; url: string; stack?: string }[],
): ErrorFingerprint[] {
  const map = new Map<string, ErrorFingerprint>();

  for (const error of errors) {
    const hash = generateErrorHash(error.text, error.url, error.stack);

    const existing = map.get(hash);
    if (existing) {
      existing.count++;
      existing.lastSeen = Math.max(existing.lastSeen, error.timestamp);
      existing.firstSeen = Math.min(existing.firstSeen, error.timestamp);
    } else {
      map.set(hash, {
        hash,
        message: error.text,
        source: error.url,
        count: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        level: error.level,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
