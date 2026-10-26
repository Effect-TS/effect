/**
 * Parses JSON5 configuration files without external dependencies.
 *
 * @stability unstable
 * @since 4.0.7
 */

const space = /(?:[\t\n\v\f\r \u00A0\u2028\u2029\uFEFF\p{Zs}]|\/\/[^\n\r\u2028\u2029]*|\/\*[^]*?\*\/)*/uy
const idStart = /[$_\p{ID_Start}]/u
const idPart = /[$\u200C\u200D\p{ID_Continue}]/u
const digits = /\d*/y
const hexDigits = /[\da-fA-F]*/y
const isDigit = (c: string) => c >= "0" && c <= "9"
const isHexDigit = (c: string) => /^[\da-fA-F]$/.test(c)

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
export const parse = (text: string): unknown => {
  let i = 0

  const fail = (at: number): never => {
    const lines = text.slice(0, at).split(/\r\n|[\n\r\u2028\u2029]/)
    const line = lines.length
    const column = lines[line - 1].length + 1
    throw new SyntaxError(`Invalid JSON5 at line ${line}, column ${column}`)
  }

  /** Skips whitespace and comments, rejecting a `/` that starts neither. */
  const skip = () => {
    space.lastIndex = i
    space.test(text)
    i = space.lastIndex
    if (text.charAt(i) === "/") {
      fail(text.charAt(i + 1) === "*" ? text.length : i + 1)
    }
  }

  const run = (pattern: RegExp) => {
    pattern.lastIndex = i
    pattern.test(text)
    return pattern.lastIndex - i
  }

  const word = <A>(literal: string, result: A): A => {
    for (const c of literal) {
      if (text.charAt(i) !== c) fail(i)
      i++
    }
    return result
  }

  const hex = (count: number) => {
    const start = i
    for (; i < start + count; i++) if (!isHexDigit(text.charAt(i))) fail(i)
    return String.fromCharCode(parseInt(text.slice(start, i), 16))
  }

  const number = () => {
    let sign = 1
    if (text.charAt(i) === "+" || text.charAt(i) === "-") {
      sign = text.charAt(i++) === "-" ? -1 : 1
    }
    const start = i
    const c = text.charAt(i)
    if (c === "I") return word("Infinity", sign * Infinity)
    if (c === "N") return word("NaN", NaN)
    if (c === "0" && /[xX]/.test(text.charAt(i + 1))) {
      i += 2
      if (run(hexDigits) === 0) fail(i)
      i = hexDigits.lastIndex
    } else {
      if (c === "0") i++
      else if (isDigit(c)) i += run(digits)
      else if (c !== ".") fail(i)
      if (text.charAt(i) === ".") {
        i++
        // A leading decimal point needs digits after it; a trailing one does not.
        if (run(digits) === 0 && i === start + 1) fail(i)
        i = digits.lastIndex
      }
      if (/[eE]/.test(text.charAt(i))) {
        i++
        if (/[+-]/.test(text.charAt(i))) i++
        if (run(digits) === 0) fail(i)
        i = digits.lastIndex
      }
    }
    return sign * Number(text.slice(start, i))
  }

  const string = (quote: string) => {
    let result = ""
    for (i++;;) {
      const c = text.charAt(i++)
      if (c === quote) return result
      if (c === "" || c === "\n" || c === "\r") fail(i - 1)
      if (c !== "\\") {
        result += c
        continue
      }
      const e = text.charAt(i++)
      const simple = "bfnrtv".indexOf(e)
      if (e === "" || /[1-9]/.test(e)) fail(i - 1)
      else if (simple !== -1) result += "\b\f\n\r\t\v"[simple]
      else if (e === "x" || e === "u") result += hex(e === "x" ? 2 : 4)
      else if (e === "0") {
        if (isDigit(text.charAt(i))) fail(i)
        result += "\0"
      } else if (e === "\r") {
        // A line continuation: CR LF, like a single line terminator, contributes nothing.
        if (text.charAt(i) === "\n") i++
      } else if (!"\n\u2028\u2029".includes(e)) result += e
    }
  }

  const identifier = () => {
    let name = ""
    for (;;) {
      const at = i
      const valid = name === "" ? idStart : idPart
      let c = String.fromCodePoint(text.codePointAt(i) ?? 0)
      if (c === "\\") {
        if (text.charAt(i + 1) !== "u") fail(i + 1)
        i += 2
        c = hex(4)
        if (!valid.test(c)) fail(at)
      } else if (i < text.length && valid.test(c)) i += c.length
      else if (name === "") fail(i)
      else return name
      name += c
    }
  }

  const value = (): unknown => {
    skip()
    const c = text.charAt(i)
    if (c === "{") {
      const entries: Array<readonly [string, unknown]> = []
      for (i++, skip(); text.charAt(i) !== "}";) {
        const q = text.charAt(i)
        const key = q === "\"" || q === "'" ? string(q) : identifier()
        skip()
        if (text.charAt(i++) !== ":") fail(i - 1)
        entries.push([key, value()])
        if (separated("}")) break
      }
      i++
      // Own data properties, so a `__proto__` key stays plain data, and the last duplicate wins.
      return Object.fromEntries(entries)
    }
    if (c === "[") {
      const items: Array<unknown> = []
      for (i++, skip(); text.charAt(i) !== "]";) {
        items.push(value())
        if (separated("]")) break
      }
      i++
      return items
    }
    if (c === "\"" || c === "'") return string(c)
    if (c === "n") return word("null", null)
    if (c === "t") return word("true", true)
    if (c === "f") return word("false", false)
    if (c !== "" && "+-.0123456789IN".includes(c)) return number()
    return fail(i)
  }

  /** After a member: consumes a comma, or reports whether `close` follows. */
  const separated = (close: string) => {
    skip()
    if (text.charAt(i) === close) return true
    if (text.charAt(i) !== ",") fail(i)
    i++
    skip()
    return false
  }

  const result = value()
  skip()
  if (i < text.length) fail(i)
  return result
}
