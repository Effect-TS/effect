/**
 * @unstable
 */
const ESCAPE_SCRIPT_DATA = /</g

const ESCAPE_LINE_TERMS = /[\u2028\u2029]/g

/**
 * @internal
 * @unstable
 */
export function escapeJson(spec: unknown): string {
  return JSON.stringify(spec)
    .replace(ESCAPE_SCRIPT_DATA, "\\u003c")
    .replace(ESCAPE_LINE_TERMS, (c) => c === "\u2028" ? "\\u2028" : "\\u2029")
}

/**
 * @internal
 * @unstable
 */
export function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * @internal
 * @unstable
 */
export function escapeAttribute(str: string): string {
  return escape(str)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
