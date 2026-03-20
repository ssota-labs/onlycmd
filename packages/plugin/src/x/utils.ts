/**
 * Utility helpers for X plugin.
 * Ported from x-cli's utils.py.
 */

/**
 * Extract a tweet ID from a URL or raw numeric string.
 */
export function parseTweetId(input: string): string {
  const urlMatch = input.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (urlMatch) {
    return urlMatch[1]!;
  }
  const stripped = input.trim();
  if (/^\d+$/.test(stripped)) {
    return stripped;
  }
  throw new Error(`Invalid tweet ID or URL: ${input}`);
}

/**
 * Remove leading @ from a username if present.
 */
export function stripAt(username: string): string {
  return username.replace(/^@+/, "");
}
