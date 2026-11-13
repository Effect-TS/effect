/**
 * Number-preserving JSON reader for Trino response bodies.
 *
 * Trino writes BIGINT values with `JsonGenerator.writeNumber(long)`, so a
 * plain `JSON.parse` rounds anything above 2^53. This reader keeps every
 * number as its source text ({@link JsonNumber}) and leaves the conversion to
 * the type-directed decoder in `codec.ts`.
 */
import * as Data from "effect/Data"
import * as Result from "effect/Result"

/** A JSON number kept as its source text, e.g. `"9007199254740993"` or `"1.5e3"`. */
export class JsonNumber {
  readonly source: string
  constructor(source: string) {
    this.source = source
  }
}

/** A JSON value whose numbers are {@link JsonNumber}. */
export type JsonValue =
  | null
  | boolean
  | string
  | JsonNumber
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

/** The body is not valid JSON. `offset` is the UTF-16 index where reading stopped. */
export class JsonParseError extends Data.TaggedError("JsonParseError")<{
  readonly message: string
  readonly offset: number
}> {}

class Stop {
  readonly message: string
  readonly offset: number
  constructor(message: string, offset: number) {
    this.message = message
    this.offset = offset
  }
}

const isDigit = (code: number): boolean => code >= 48 && code <= 57

/** Entries of every parsed object in wire order; see {@link entries}. */
const wireOrder = new WeakMap<object, ReadonlyArray<readonly [string, JsonValue]>>()

/** Parses a complete JSON document. */
export const parse = (text: string): Result.Result<JsonValue, JsonParseError> => {
  let i = 0
  const length = text.length

  const stop = (message: string): never => {
    throw new Stop(message, i)
  }
  const skipWhitespace = (): void => {
    while (i < length) {
      const c = text.charCodeAt(i)
      if (c === 32 || c === 9 || c === 10 || c === 13) i++
      else return
    }
  }
  const keyword = (word: string, value: JsonValue): JsonValue => {
    if (!text.startsWith(word, i)) stop("Unexpected token")
    i += word.length
    return value
  }
  const readString = (): string => {
    i++ // opening quote
    let out = ""
    let start = i
    while (true) {
      if (i >= length) stop("Unterminated string")
      const c = text.charCodeAt(i)
      if (c === 34) {
        out += text.slice(start, i)
        i++
        return out
      }
      if (c < 32) stop("Control character in string")
      if (c !== 92) {
        i++
        continue
      }
      out += text.slice(start, i)
      i++
      switch (text.charCodeAt(i)) {
        case 34:
          out += "\""
          break
        case 92:
          out += "\\"
          break
        case 47:
          out += "/"
          break
        case 98:
          out += "\b"
          break
        case 102:
          out += "\f"
          break
        case 110:
          out += "\n"
          break
        case 114:
          out += "\r"
          break
        case 116:
          out += "\t"
          break
        case 117: {
          const hex = text.slice(i + 1, i + 5)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) stop("Invalid unicode escape")
          out += String.fromCharCode(parseInt(hex, 16))
          i += 4
          break
        }
        default:
          stop("Invalid escape")
      }
      i++
      start = i
    }
  }
  const readDigits = (): void => {
    const start = i
    while (i < length && isDigit(text.charCodeAt(i))) i++
    if (i === start) stop("Expected a digit")
  }
  const readNumber = (): JsonNumber => {
    const start = i
    if (text.charCodeAt(i) === 45) i++
    if (text.charCodeAt(i) === 48) i++
    else readDigits()
    if (text.charCodeAt(i) === 46) {
      i++
      readDigits()
    }
    const e = text.charCodeAt(i)
    if (e === 101 || e === 69) {
      i++
      const sign = text.charCodeAt(i)
      if (sign === 43 || sign === 45) i++
      readDigits()
    }
    return new JsonNumber(text.slice(start, i))
  }
  const readValue = (): JsonValue => {
    skipWhitespace()
    const c = text.charCodeAt(i)
    switch (c) {
      case 123: {
        i++
        const out: Record<string, JsonValue> = {}
        const order: Array<readonly [string, JsonValue]> = []
        wireOrder.set(out, order)
        skipWhitespace()
        if (text.charCodeAt(i) === 125) {
          i++
          return out
        }
        while (true) {
          skipWhitespace()
          if (text.charCodeAt(i) !== 34) stop("Expected an object key")
          const key = readString()
          skipWhitespace()
          if (text.charCodeAt(i) !== 58) stop("Expected ':'")
          i++
          // `__proto__` must stay an own data property, never the prototype
          const value = readValue()
          Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true })
          order.push([key, value])
          skipWhitespace()
          const next = text.charCodeAt(i)
          i++
          if (next === 125) return out
          if (next !== 44) {
            i--
            stop("Expected ',' or '}'")
          }
        }
      }
      case 91: {
        i++
        const out: Array<JsonValue> = []
        skipWhitespace()
        if (text.charCodeAt(i) === 93) {
          i++
          return out
        }
        while (true) {
          out.push(readValue())
          skipWhitespace()
          const next = text.charCodeAt(i)
          i++
          if (next === 93) return out
          if (next !== 44) {
            i--
            stop("Expected ',' or ']'")
          }
        }
      }
      case 34:
        return readString()
      case 116:
        return keyword("true", true)
      case 102:
        return keyword("false", false)
      case 110:
        return keyword("null", null)
      default:
        if (c === 45 || isDigit(c)) return readNumber()
        return stop(i >= length ? "Unexpected end of input" : "Unexpected token")
    }
  }

  try {
    const value = readValue()
    skipWhitespace()
    if (i !== length) stop("Unexpected data after the JSON value")
    return Result.succeed(value)
  } catch (error) {
    if (error instanceof Stop) {
      return Result.fail(new JsonParseError({ message: error.message, offset: error.offset }))
    }
    throw error
  }
}

/** The JSON value is an object (not an array, number or null). */
export const isObject = (value: JsonValue | undefined): value is { readonly [key: string]: JsonValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof JsonNumber)

/** The value of `key` when `value` is an object that has it as an own property. */
export const field = (value: JsonValue | undefined, key: string): JsonValue | undefined =>
  isObject(value) && Object.hasOwn(value, key) ? value[key] : undefined

/** The string, or `undefined` for any other JSON value. */
export const asString = (value: JsonValue | undefined): string | undefined =>
  typeof value === "string" ? value : undefined

/** The number as a JavaScript `number` (may round), or `undefined` for any other JSON value. */
export const asNumber = (value: JsonValue | undefined): number | undefined =>
  value instanceof JsonNumber ? Number(value.source) : undefined

/** The boolean, or `undefined` for any other JSON value. */
export const asBoolean = (value: JsonValue | undefined): boolean | undefined =>
  typeof value === "boolean" ? value : undefined

/** The array, or `undefined` for any other JSON value. */
export const asArray = (value: JsonValue | undefined): ReadonlyArray<JsonValue> | undefined =>
  Array.isArray(value) ? value : undefined

/** The object, or `undefined` for any other JSON value. */
export const asObject = (value: JsonValue | undefined): { readonly [key: string]: JsonValue } | undefined =>
  isObject(value) ? value : undefined

/**
 * The entries of a parsed object in the order they were written. JavaScript
 * enumerates integer-like keys first and ascending, so `Object.entries` would
 * reorder a MAP(bigint, …) the server wrote as `{"10": …, "2": …}`. A later
 * key repeating an earlier one keeps both entries, as written.
 */
export const entries = (value: { readonly [key: string]: JsonValue }): ReadonlyArray<readonly [string, JsonValue]> =>
  wireOrder.get(value) ?? Object.entries(value)
