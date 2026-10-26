/**
 * Parses JSON with JavaScript-style comments without external dependencies.
 *
 * The syntax target is the [JSONC draft specification](https://jsonc.org/)
 * with `jsonc-parser` 3.3.1's default profile: JSON plus line and block comments,
 * with trailing commas disabled. One leading BOM is accepted, matching the
 * TOML and YAML parsers. Decoded values follow `JSON.parse` semantics; invalid
 * documents throw instead of returning a partial result.
 *
 * @stability unstable
 * @since 4.0.7
 */

import * as internal from "../internal/jsonParser.ts"

const fail = (input: string): never => {
  // Native error wording and positions differ across engines and may quote secrets.
  internal.parse(input, "JSONC")
  throw internal.syntaxError(input, input.length, "JSONC")
}

const lineEnd = /[\r\n]/g

/**
 * Parses a JSONC document into a JavaScript value.
 *
 * **Details**
 *
 * Accepts one leading BOM and line and block comments wherever JSON permits
 * whitespace. All other syntax follows `JSON.parse`, including duplicate keys
 * and `__proto__` handling.
 *
 * **Gotchas**
 *
 * Throws a `SyntaxError` with a 1-based line and column on invalid input,
 * without including the input text. Columns count UTF-16 code units.
 * Trailing commas and JSON5 extensions are not accepted. Unlike `JSON.parse`,
 * this function has no reviver.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.7
 */
export const parse = (input: string): unknown => {
  // Ignore one leading BOM without shifting original-input error positions.
  if (input.charCodeAt(0) === 0xfeff) input = " " + input.slice(1)
  let slash = input.indexOf("/")
  let json = input
  if (slash !== -1) {
    let stripped = ""
    let start = 0
    let quote = input.indexOf("\"")
    while (slash !== -1) {
      if (quote !== -1 && quote < slash) {
        // Leave strings intact for JSON.parse to validate; a quote preceded by an
        // odd run of backslashes is escaped.
        let end = quote
        for (;;) {
          end = input.indexOf("\"", end + 1)
          if (end === -1) break
          let backslash = end - 1
          while (input.charCodeAt(backslash) === 92) backslash--
          if ((end - backslash) % 2 === 1) break
        }
        if (end === -1) break
        quote = input.indexOf("\"", end + 1)
        if (slash < end) slash = input.indexOf("/", end + 1)
        continue
      }
      const next = input.charCodeAt(slash + 1)
      let index: number
      if (next === 47) {
        lineEnd.lastIndex = slash + 2
        index = lineEnd.test(input) ? lineEnd.lastIndex - 1 : input.length
      } else if (next === 42) {
        const end = input.indexOf("*/", slash + 2)
        if (end === -1) fail(input)
        index = end + 2
      } else {
        // Not a comment; JSON.parse rejects it below.
        slash = input.indexOf("/", slash + 1)
        continue
      }
      // A space prevents comments inside invalid tokens from joining those tokens.
      stripped += input.slice(start, slash) + " "
      start = index
      slash = input.indexOf("/", index)
      if (quote !== -1 && quote < index) quote = input.indexOf("\"", index)
    }
    json = stripped + input.slice(start)
  }
  try {
    return JSON.parse(json)
  } catch {
    return fail(input)
  }
}
