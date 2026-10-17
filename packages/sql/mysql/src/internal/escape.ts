import { CodecError } from "../MysqlTypes.ts"

/**
 * MySQL's text protocol has no placeholders: `COM_QUERY` carries one finished
 * statement. A statement compiled with `?` markers therefore has to have its
 * parameters written into the SQL before it goes out, which makes this the one
 * place in the package where a mistake is an injection vulnerability rather
 * than a bug.
 *
 * Prepared statements send parameters out of band and never come through here.
 *
 * @internal
 */

/**
 * Characters MySQL requires to be escaped inside a single-quoted string, and
 * their replacements.
 *
 * @internal
 */
const escapes: Record<string, string> = {
  "\0": "\\0",
  "\b": "\\b",
  "\t": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "\x1a": "\\Z",
  "\"": "\\\"",
  "'": "\\'",
  "\\": "\\\\"
}

// NUL and Ctrl-Z are exactly the characters MySQL requires escaping, so
// matching them here is the point.
// eslint-disable-next-line no-control-regex
const escapePattern = /[\0\b\t\n\r\x1a"'\\]/g

/** @internal */
export const escapeString = (value: string): string => `'${value.replace(escapePattern, (c) => escapes[c])}'`

const hexDigits = "0123456789abcdef"

const escapeBytes = (value: Uint8Array): string => {
  let text = "X'"
  for (let index = 0; index < value.length; index++) {
    const byte = value[index]
    text += hexDigits[byte >> 4] + hexDigits[byte & 0x0f]
  }
  return text + "'"
}

/**
 * Formats a `Date` as a MySQL datetime literal in UTC, matching the session
 * time zone the connection sets on connect.
 *
 * @internal
 */
const escapeDate = (value: Date): string => {
  const time = value.getTime()
  if (Number.isNaN(time)) {
    throw new CodecError({ message: "Cannot bind an invalid Date" })
  }
  const pad = (n: number, width: number) => String(n).padStart(width, "0")
  return escapeString(
    `${pad(value.getUTCFullYear(), 4)}-${pad(value.getUTCMonth() + 1, 2)}-${pad(value.getUTCDate(), 2)} ` +
      `${pad(value.getUTCHours(), 2)}:${pad(value.getUTCMinutes(), 2)}:${pad(value.getUTCSeconds(), 2)}.` +
      `${pad(value.getUTCMilliseconds(), 3)}`
  )
}

/**
 * Renders one parameter as a SQL literal.
 *
 * @internal
 */
export const escapeValue = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL"
  switch (typeof value) {
    case "string":
      return escapeString(value)
    case "number":
      if (!Number.isFinite(value)) {
        throw new CodecError({ message: `Cannot bind the non-finite number ${value}` })
      }
      return String(value)
    case "bigint":
      return String(value)
    case "boolean":
      return value ? "1" : "0"
    case "object":
      break
    default:
      throw new CodecError({ message: `Cannot bind a value of type ${typeof value}` })
  }
  if (value instanceof Date) return escapeDate(value)
  if (value instanceof Uint8Array) return escapeBytes(value)
  if (value instanceof Int8Array) return escapeBytes(new Uint8Array(value.buffer, value.byteOffset, value.length))
  // An array binds as a comma-separated list, which is what `sql.in` needs.
  if (Array.isArray(value)) return value.map(escapeValue).join(", ")
  // Anything else is stored as JSON, matching how a JSON column round-trips.
  return escapeString(JSON.stringify(value))
}

/**
 * Replaces each `?` placeholder in `sql` with its parameter.
 *
 * Placeholders inside string literals, quoted identifiers and comments are
 * left alone, so a literal question mark in the statement text is never
 * mistaken for a placeholder.
 *
 * @internal
 */
export const bindParameters = (sql: string, params: ReadonlyArray<unknown>): string => {
  if (params.length === 0) return sql
  let out = ""
  let index = 0
  let next = 0
  while (index < sql.length) {
    const char = sql[index]
    switch (char) {
      case "'":
      case "\"":
      case "`": {
        // Copy the quoted run verbatim, honouring backslash escapes inside the
        // two string quotes and the doubled-quote form used by all three.
        const quote = char
        const backslashes = quote !== "`"
        let end = index + 1
        while (end < sql.length) {
          if (backslashes && sql[end] === "\\") {
            end += 2
            continue
          }
          if (sql[end] === quote) {
            if (sql[end + 1] === quote) {
              end += 2
              continue
            }
            end += 1
            break
          }
          end += 1
        }
        out += sql.slice(index, end)
        index = end
        continue
      }
      case "-":
        if (sql[index + 1] === "-") {
          const end = sql.indexOf("\n", index)
          const stop = end === -1 ? sql.length : end
          out += sql.slice(index, stop)
          index = stop
          continue
        }
        break
      case "#": {
        const end = sql.indexOf("\n", index)
        const stop = end === -1 ? sql.length : end
        out += sql.slice(index, stop)
        index = stop
        continue
      }
      case "/":
        if (sql[index + 1] === "*") {
          const end = sql.indexOf("*/", index + 2)
          const stop = end === -1 ? sql.length : end + 2
          out += sql.slice(index, stop)
          index = stop
          continue
        }
        break
      case "?": {
        if (next >= params.length) {
          throw new CodecError({
            message: `Statement has more placeholders than the ${params.length} parameter(s) supplied`
          })
        }
        out += escapeValue(params[next++])
        index += 1
        continue
      }
    }
    out += char
    index += 1
  }
  if (next !== params.length) {
    throw new CodecError({
      message: `Statement has ${next} placeholder(s) but ${params.length} parameter(s) were supplied`
    })
  }
  return out
}
