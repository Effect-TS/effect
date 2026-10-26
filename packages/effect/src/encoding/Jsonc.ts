/**
 * Parses JSON with JavaScript-style comments without external dependencies.
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

/**
 * Parses a JSONC document into a JavaScript value.
 *
 * **Details**
 *
 * Accepts line and block comments wherever JSON permits whitespace. All other
 * syntax follows `JSON.parse`, including duplicate keys and `__proto__` handling.
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
  const parts: Array<string> = []
  let start = 0
  let index = 0
  while (index < input.length) {
    const character = input[index]
    if (character === "\"") {
      // Leave strings intact for JSON.parse to validate, skipping escaped quotes.
      for (index++; index < input.length; index++) {
        if (input[index] === "\\") index++
        else if (input[index] === "\"") {
          index++
          break
        }
      }
    } else if (character === "/" && (input[index + 1] === "/" || input[index + 1] === "*")) {
      parts.push(input.slice(start, index), " ")
      if (input[index + 1] === "/") {
        index += 2
        while (index < input.length && input[index] !== "\r" && input[index] !== "\n") index++
      } else {
        const end = input.indexOf("*/", index + 2)
        if (end === -1) fail(input)
        index = end + 2
      }
      // A space prevents comments inside invalid tokens from joining those tokens.
      start = index
    } else {
      index++
    }
  }
  parts.push(input.slice(start))
  try {
    return JSON.parse(parts.join(""))
  } catch {
    return fail(input)
  }
}
