/**
 * Parses JSON5 configuration files without external dependencies.
 *
 * @stability unstable
 * @since 4.0.7
 */

import * as internal from "../internal/jsonParser.ts"

/**
 * Parses a JSON5 document into a JavaScript value.
 *
 * **Details**
 *
 * Accepts comments, trailing commas, unquoted identifier keys, single-quoted
 * strings, hexadecimal numbers, `Infinity`, and `NaN`. Duplicate keys use the
 * last value; `__proto__` is preserved as an own data property.
 *
 * **Gotchas**
 *
 * Throws a `SyntaxError` with a line and column on invalid input. Error messages
 * do not include the input text. Unlike `JSON.parse`, this function has no reviver.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.7
 */
export const parse = (text: string): unknown => internal.parse(text, "JSON5")
