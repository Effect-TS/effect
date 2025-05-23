// Regex to find closing </script> tags in JSON to prevent breaking out of script context
const ESCAPE_SCRIPT_END = /<\/script>/gi

// Regex to find Unicode line terminators that are valid JSON but break JS string literals
const ESCAPE_LINE_TERMS = /[\u2028\u2029]/g

/**
 * Safely serialize an object to a JSON string
 * and escape any sequences that could break <script> blocks.
 *
 * - Replaces `</script>` with `<\/script>` to avoid premature tag closing.
 * - Escapes U+2028 and U+2029 as literal \u2028 / \u2029.
 *
 * @internal
 */
export function escapeJson(spec: unknown): string {
  return JSON.stringify(spec)
    .replace(ESCAPE_SCRIPT_END, "<\\/script>")
    .replace(ESCAPE_LINE_TERMS, (c) => c === "\u2028" ? "\\u2028" : "\\u2029")
}

/**
 * HTML-escape text content to prevent injection in text nodes or attributes.
 *
 * @internal
 */
export function escape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
