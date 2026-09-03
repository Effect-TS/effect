/**
 * Helpers for escaping JSON Pointer path segments and converting JSON Pointer
 * URI fragments. JSON Pointer uses `/` to separate path tokens inside a JSON
 * document, so token text must encode literal `~` and `/` characters. URI
 * fragments additionally apply percent-encoding after JSON Pointer escaping.
 *
 * @since 4.0.0
 */

/**
 * Escapes a JSON Pointer reference token according to RFC 6901 by encoding special characters so the token can be safely used as a segment in a JSON Pointer.
 *
 * **When to use**
 *
 * Use when you need to escape a single JSON Pointer path segment.
 *
 * **Details**
 *
 * - Returns a new escaped string
 * - Replaces `~` (tilde) with `~0` and `/` (forward slash) with `~1`
 * - Returns the input unchanged if it contains no special characters
 * - Empty strings are valid and returned unchanged
 *
 * **Gotchas**
 *
 * The replacement order matters: `~` is replaced before `/` to prevent double-escaping.
 *
 * **Example** (Escaping special characters)
 *
 * ```ts import.meta.vitest
 * import { JsonPointer } from "effect"
 *
 * JsonPointer.escapeToken("a/b") // => "a~1b"
 * JsonPointer.escapeToken("c~d") // => "c~0d"
 * JsonPointer.escapeToken("path/to~key") // => "path~1to~0key"
 * ```
 *
 * @see {@link unescapeToken} The inverse operation for decoding escaped tokens
 * @category encoding
 * @since 4.0.0
 */
export function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1")
}

/**
 * Decodes a JSON Pointer reference token according to RFC 6901 escaping rules.
 *
 * **When to use**
 *
 * Use when you need to decode a single escaped JSON Pointer path segment.
 *
 * **Details**
 *
 * - Returns a new unescaped string
 * - Replaces `~1` with `/` (forward slash) and `~0` with `~` (tilde)
 * - Returns the input unchanged if it contains no escaped sequences
 * - Empty strings are valid and returned unchanged
 *
 * **Gotchas**
 *
 * The replacement order matters: `~1` is replaced before `~0` to prevent incorrect decoding.
 *
 * **Example** (Unescaping special characters)
 *
 * ```ts import.meta.vitest
 * import { JsonPointer } from "effect"
 *
 * JsonPointer.unescapeToken("a~1b") // => "a/b"
 * JsonPointer.unescapeToken("c~0d") // => "c~d"
 * JsonPointer.unescapeToken("path~1to~0key") // => "path/to~key"
 * ```
 *
 * @see {@link escapeToken} The inverse operation for encoding tokens
 * @category decoding
 * @since 4.0.0
 */
export function unescapeToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~")
}

/**
 * Parses a JSON Pointer URI fragment into decoded path tokens.
 *
 * **When to use**
 *
 * Use when you need to resolve a URI fragment against a JSON document.
 *
 * **Details**
 *
 * Percent-encoding is decoded before the pointer is split into tokens, then
 * each token is decoded with {@link unescapeToken}. The empty string and `#`
 * both represent the document root.
 *
 * **Gotchas**
 *
 * Returns `undefined` when the input is not a URI fragment, contains invalid
 * percent-encoding, or contains an invalid JSON Pointer escape sequence.
 *
 * **Example** (Parsing URI fragments)
 *
 * ```ts import.meta.vitest
 * import { JsonPointer } from "effect"
 *
 * JsonPointer.parseUriFragment("#/users/a~1b") // => ["users", "a/b"]
 * JsonPointer.parseUriFragment("#/caf%C3%A9") // => ["café"]
 * JsonPointer.parseUriFragment("#/%") // => undefined
 * ```
 *
 * @see {@link formatUriFragment} for the inverse operation
 * @category decoding
 * @since 4.0.0
 */
export function parseUriFragment(fragment: string): ReadonlyArray<string> | undefined {
  if (fragment.length === 0 || fragment === "#") return []
  if (!fragment.startsWith("#")) return undefined
  let pointer: string
  try {
    pointer = decodeURIComponent(fragment.slice(1))
  } catch {
    return undefined
  }
  if (!pointer.startsWith("/") || /~(?:[^01]|$)/.test(pointer)) return undefined
  return pointer.slice(1).split("/").map(unescapeToken)
}

/**
 * Formats path tokens as a JSON Pointer URI fragment.
 *
 * **When to use**
 *
 * Use when you need a URI fragment that identifies a value in a JSON document.
 *
 * **Details**
 *
 * Each token is encoded with {@link escapeToken} before URI percent-encoding
 * is applied. An empty path is formatted as `#`.
 *
 * **Gotchas**
 *
 * Throws a `URIError` when a token contains an unpaired surrogate.
 *
 * **Example** (Formatting a URI fragment)
 *
 * ```ts import.meta.vitest
 * import { JsonPointer } from "effect"
 *
 * JsonPointer.formatUriFragment(["users", "a/b", "Rate%"]) // => "#/users/a~1b/Rate%25"
 * ```
 *
 * @see {@link parseUriFragment} for the inverse operation
 * @category encoding
 * @since 4.0.0
 */
export function formatUriFragment(path: ReadonlyArray<string>): string {
  return path.length === 0
    ? "#"
    : `#/${path.map((token) => encodeURI(escapeToken(token)).replace(/#/g, "%23")).join("/")}`
}
