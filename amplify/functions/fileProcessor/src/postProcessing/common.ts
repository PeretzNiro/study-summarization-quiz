/**
 * Common utilities for text processing
 */

/**
 * Escapes special characters in a string for use in a regular expression
 * @param string The input string to escape
 * @returns Escaped string with special regex characters properly escaped
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}