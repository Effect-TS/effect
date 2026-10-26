/** @internal */

const json5Space = /(?:[\t\n\v\f\r \u00A0\u2028\u2029\uFEFF\p{Zs}]|\/\/[^\n\r\u2028\u2029]*|\/\*[^]*?\*\/)*/uy
const idStart = /[$_\p{ID_Start}]/u
const idPart = /[$\u200C\u200D\p{ID_Continue}]/u
const idName = /[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*/uy
const digits = /\d*/y
const hexDigits = /[\da-fA-F]*/y
const isDigit = (c: string) => c >= "0" && c <= "9"
const isHexDigit = (c: string) => /^[\da-fA-F]$/.test(c)

const jsoncSpace = /(?:[ \t\r\n]|\/\/[^\r\n]*|\/\*[^]*?\*\/)*/uy
const jsonNumber = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y

// Runs of string content that need no further inspection.
const json5Double = /[^"\\\n\r]*/y
const json5Single = /[^'\\\n\r]*/y
// JSON forbids unescaped U+0000 through U+001F.
// oxlint-disable-next-line no-control-regex
const jsonDouble = /[^"\\\x00-\x1f]*/y

type Format = "JSON5" | "JSONC"

export const syntaxError = (text: string, at: number, format: Format): SyntaxError => {
  const json5 = format === "JSON5"
  const lines = text.slice(0, at).split(json5 ? /\r\n|[\n\r\u2028\u2029]/ : /\r\n|[\n\r]/)
  return new SyntaxError(
    `Invalid ${json5 ? "JSON5" : "JSONC"} at line ${lines.length}, column ${lines[lines.length - 1].length + 1}`
  )
}

type Frame =
  | { readonly object: true; readonly entries: Array<[string, unknown]>; first: boolean }
  | { readonly object: false; readonly items: Array<unknown>; first: boolean }

// JSONC uses the strict mode only to locate errors after the native parser fails.
export const parse = (text: string, format: Format): unknown => {
  const json5 = format === "JSON5"
  const space = json5 ? json5Space : jsoncSpace
  let i = 0

  const fail = (at: number): never => {
    throw syntaxError(text, at, format)
  }

  /** Skips whitespace and comments, rejecting a `/` that starts neither. */
  const skip = () => {
    let code = text.charCodeAt(i)
    // Plain ASCII whitespace dominates formatted documents; comments and JSON5's
    // Unicode whitespace fall through to the full pattern.
    while (code === 0x20 || code === 0x0a || code === 0x0d || code === 0x09) code = text.charCodeAt(++i)
    if (code > 0x20 && code !== 0x2f && code < 0xa0) return
    space.lastIndex = i
    space.test(text)
    i = space.lastIndex
    if (text.charCodeAt(i) === 0x2f) {
      fail(text.charAt(i + 1) === "*" ? text.length : i + 1)
    }
  }

  const run = (pattern: RegExp) => {
    pattern.lastIndex = i
    return pattern.test(text) ? pattern.lastIndex - i : 0
  }

  const word = <A>(literal: string, result: A): A => {
    if (text.startsWith(literal, i)) {
      i += literal.length
      return result
    }
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
    if (!json5) {
      const length = run(jsonNumber)
      if (length === 0) fail(i)
      const start = i
      i += length
      return Number(text.slice(start, i))
    }
    let sign = 1
    if (text.charAt(i) === "+" || text.charAt(i) === "-") {
      sign = text.charAt(i++) === "-" ? -1 : 1
    }
    const start = i
    const c = text.charAt(i)
    if (c === "I") return word("Infinity", sign * Infinity)
    if (c === "N") return word("NaN", NaN)
    if (c === "0" && (text.charAt(i + 1) === "x" || text.charAt(i + 1) === "X")) {
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
      if (text.charAt(i) === "e" || text.charAt(i) === "E") {
        i++
        if (text.charAt(i) === "+" || text.charAt(i) === "-") i++
        if (run(digits) === 0) fail(i)
        i = digits.lastIndex
      }
    }
    return sign * Number(text.slice(start, i))
  }

  const string = (quote: string) => {
    const plain = quote === "'" ? json5Single : json5 ? json5Double : jsonDouble
    let result = ""
    for (i++;;) {
      plain.lastIndex = i
      plain.test(text)
      if (plain.lastIndex > i) {
        result += text.slice(i, plain.lastIndex)
        i = plain.lastIndex
      }
      const c = text.charAt(i++)
      if (c === quote) return result
      // Anything else that stops a plain run is an escape or a forbidden character.
      if (c !== "\\") fail(i - 1)
      const e = text.charAt(i++)
      if (!json5 && !"\"\\/bfnrtu".includes(e)) fail(i - 1)
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
    idName.lastIndex = i
    if (idName.test(text)) {
      name = text.slice(i, idName.lastIndex)
      i = idName.lastIndex
      if (text.charAt(i) !== "\\") return name
    }
    // Escapes are validated one code unit at a time.
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

  const stack: Array<Frame> = []

  /** Reads a value at `i`, which must already be past any whitespace. */
  const value = (): unknown => {
    const c = text.charAt(i)
    if (c === "{" || c === "[") {
      stack.push(c === "[" ? { object: false, items: [], first: true } : { object: true, entries: [], first: true })
      i++
      return undefined
    }
    if (c === "\"" || (json5 && c === "'")) return string(c)
    if (c === "n") return word("null", null)
    if (c === "t") return word("true", true)
    if (c === "f") return word("false", false)
    if (c !== "" && "+-.0123456789IN".includes(c)) return number()
    return fail(i)
  }

  /** After a member: consumes a comma unless the collection ends. */
  const separated = (close: string) => {
    skip()
    if (text.charAt(i) === close) return
    if (text.charAt(i) !== ",") fail(i)
    i++
    skip()
    if (!json5 && text.charAt(i) === close) fail(i)
  }

  skip()
  let result = value()
  // An explicit stack also lets the JSONC diagnostic path locate errors in deeply nested documents.
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    const close = frame.object ? "}" : "]"
    if (frame.first) skip()
    else separated(close)
    if (text.charAt(i) === close) {
      stack.pop()
      i++
      const completed = frame.object ? Object.fromEntries(frame.entries) : frame.items
      const parent = stack[stack.length - 1]
      if (parent === undefined) result = completed
      else if (parent.object) parent.entries[parent.entries.length - 1][1] = completed
      else parent.items[parent.items.length - 1] = completed
      continue
    }
    frame.first = false
    if (!frame.object) {
      frame.items.push(value())
    } else {
      const quote = text.charAt(i)
      if (!json5 && quote !== "\"") fail(i)
      const key = quote === "\"" || quote === "'" ? string(quote) : identifier()
      skip()
      if (text.charAt(i++) !== ":") fail(i - 1)
      skip()
      // Object.fromEntries keeps __proto__ as data and preserves duplicate-key ordering.
      frame.entries.push([key, value()])
    }
  }
  skip()
  if (i < text.length) fail(i)
  return result
}
