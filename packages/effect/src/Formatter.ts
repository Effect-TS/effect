/**
 * Formats JavaScript values into readable strings.
 *
 * `format` is intended for logs, diagnostics, and error messages. It handles
 * primitives, objects, arrays, dates, regular expressions, maps, sets, class
 * instances, errors, circular references, and redactable values. `formatJson`
 * wraps JSON formatting with redaction and circular-reference handling, and the
 * module also includes helpers for property keys, paths, and dates.
 *
 * @stability stable
 * @since 4.0.0
 */
import * as Predicate from "./Predicate.ts"
import { getRedacted, redact, symbolRedactable } from "./Redactable.ts"

/**
 * A callable interface representing a function that converts a `Value` into a `Format`, which defaults to `string`.
 *
 * **When to use**
 *
 * Use when you want to type a formatting or rendering function generically, or when you are building a pipeline that accepts pluggable formatters.
 *
 * **Details**
 *
 * This is a pure callable type and carries no runtime implementation. It is contravariant in `Value` and covariant in `Format`.
 *
 * **Example** (Defining a custom formatter)
 *
 * ```ts import.meta.vitest
 * import type { Formatter } from "effect"
 *
 * const upper: Formatter.Formatter<string> = (s) => s.toUpperCase()
 *
 * upper("hello") // => "HELLO"
 * ```
 *
 * @see {@link format}
 * @see {@link formatJson}
 * @stability stable
 * @category models
 * @since 4.0.0
 */
export interface Formatter<in Value, out Format = string> {
  (value: Value): Format
}

/**
 * Converts any JavaScript value into a human-readable string.
 *
 * **When to use**
 *
 * Use when you need to format arbitrary JavaScript values for debugging,
 * logging, or error messages.
 *
 * **Details**
 *
 * - Output is **not** valid JSON; use {@link formatJson} when you need
 *   parseable JSON.
 * - Handles `BigInt`, `Symbol`, `Set`, `Map`, `Date`, `RegExp`, and class
 *   instances that `JSON.stringify` cannot represent.
 * - Circular references are shown as `"[Circular]"` instead of throwing.
 * - Failures while inspecting a value are rendered as diagnostic placeholders instead of throwing.
 * - Primitives: stringified naturally (`null`, `undefined`, `123`, `true`).
 *   Strings are JSON-quoted.
 * - Objects with a custom `toString` (not `Object.prototype.toString`):
 *   `toString()` is called unless `ignoreToString` is `true`.
 * - Errors with a `cause`: formatted as `"<message> (cause: <cause>)"`.
 * - Iterables (`Set`, `Map`, etc.): formatted as
 *   `ClassName([...elements])`.
 * - Class instances: wrapped as `ClassName({...})`.
 * - When listing object properties, includes own string and symbol keys,
 *   including non-enumerable ones. Inherited properties are not listed.
 * - `Redactable` values are automatically redacted.
 * - Arrays/objects with 0–1 entries are inline; larger ones are
 *   pretty-printed when `space` is set.
 * - `space` — indentation unit (number of spaces, or a string like
 *   `"\t"`). Defaults to `0` (compact).
 * - `ignoreToString` — skip calling `toString()`. Defaults to `false`.
 *
 * **Example** (Formatting compact output)
 *
 * ```ts import.meta.vitest
 * import { Formatter } from "effect"
 *
 * Formatter.format({ a: 1, b: [2, 3] }) // => "{\"a\":1,\"b\":[2,3]}"
 * ```
 *
 * **Example** (Pretty-printed output)
 *
 * ```ts import.meta.vitest
 * import { Formatter } from "effect"
 *
 * const output = Formatter.format({ a: 1, b: [2, 3] }, { space: 2 })
 * output // => "{\n  \"a\": 1,\n  \"b\": [\n    2,\n    3\n  ]\n}"
 * ```
 *
 * **Example** (Handling circular references)
 *
 * ```ts import.meta.vitest
 * import { Formatter } from "effect"
 *
 * const obj: any = { name: "loop" }
 * obj.self = obj
 * Formatter.format(obj) // => "{\"name\":\"loop\",\"self\":[Circular]}"
 * ```
 *
 * @see {@link formatJson}
 * @see {@link Formatter}
 * @stability stable
 * @category formatting
 * @since 2.0.0
 */
export function format(input: unknown, options?: {
  readonly space?: number | string | undefined
  readonly ignoreToString?: boolean | undefined
}): string {
  const space = options?.space
  const ancestors = new WeakSet<object>()
  const gap = typeof space === "number" ? " ".repeat(space) : space ?? ""
  const ignoreToString = options?.ignoreToString === true

  const formatBlock = <A>(
    open: string,
    close: string,
    items: ReadonlyArray<A>,
    d: number,
    render: (item: A, nextDepth: number, multiline: boolean) => string
  ): string => {
    const multiline = Boolean(gap) && items.length > 1
    const next = multiline ? d + 1 : d
    const rendered = items.map((item) => render(item, next, multiline))
    if (!multiline) return `${open}${rendered.join(",")}${close}`
    const pad = gap.repeat(next)
    return `${open}\n${pad}${rendered.join(`,\n${pad}`)}\n${gap.repeat(d)}${close}`
  }

  function recur(v: unknown, d: number): string {
    try {
      if (typeof v === "string") return JSON.stringify(v)
      if (typeof v === "bigint") return `${v}n`
      if (v === null || (typeof v !== "object" && typeof v !== "function")) return String(v)

      if (ancestors.has(v)) return "[Circular]"
      ancestors.add(v)

      let output: string
      if (symbolRedactable in v) {
        output = recur(getRedacted(v as any), d)
      } else if (Array.isArray(v)) {
        output = formatBlock("[", "]", v, d, (x, next) => recur(x, next))
      } else if (v instanceof Date) {
        output = formatDate(v)
      } else {
        const toString = ignoreToString ? undefined : (v as any).toString
        if (
          typeof toString === "function" &&
          toString !== Object.prototype.toString &&
          toString !== Array.prototype.toString
        ) {
          const s = tryOr(() => String(toString.call(v)), "[toString threw]")
          output = v instanceof Error && v.cause !== undefined ? `${s} (cause: ${recur(v.cause, d)})` : s
        } else if (Symbol.iterator in v) {
          output = `${v.constructor.name}(${recur(Array.from(v as any), d)})`
        } else {
          const keys = tryOr(() => Reflect.ownKeys(v), ownKeysThrew)
          const body = formatBlock(
            "{",
            "}",
            keys,
            d,
            (k, next, multiline) =>
              `${formatPropertyKey(k)}${multiline ? ": " : ":"}${
                recur(tryOr(() => (v as any)[k], "[property access threw]"), next)
              }`
          )
          const ctor = (v as any).constructor
          output = ctor && ctor !== Object && ctor.name ? `${ctor.name}(${body})` : body
        }
      }
      ancestors.delete(v)
      return output
    } catch {
      // WeakSet.prototype.delete returns false for non-objects without throwing.
      ancestors.delete(v as any)
      return "[inspection threw]"
    }
  }

  return recur(input, 0)
}

/**
 * @internal
 */
export function formatPropertyKey(name: PropertyKey): string {
  return typeof name === "string" ? JSON.stringify(name) : String(name)
}

/**
 * Formats an array of property keys as a bracket-notation path string.
 *
 * @internal
 */
export function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path.map((key) => `[${formatPropertyKey(key)}]`).join("")
}

/**
 * Formats a `Date` as an ISO 8601 string, returning `"Invalid Date"` for
 * invalid dates instead of throwing.
 *
 * @internal
 */
export function formatDate(date: Date): string {
  return tryOr(() => date.toISOString(), "Invalid Date")
}

const ownKeysThrew: ReadonlyArray<PropertyKey> = ["[ownKeys threw]"]

function tryOr<A>(f: () => A, fallback: A): A {
  try {
    return f()
  } catch {
    return fallback
  }
}

/**
 * Stringifies a value to JSON safely, silently dropping circular references.
 *
 * **When to use**
 *
 * Use when you need valid JSON output, unlike `format`, and the input may
 * contain circular references that should be silently omitted rather than
 * throwing a `TypeError`.
 *
 * **Details**
 *
 * Uses `JSON.stringify` internally with a replacer that tracks the current
 * object ancestry. Circular references are replaced with `undefined`, which
 * omits them from object output. `Redactable` values are automatically redacted
 * before serialization. `BigInt` values are stringified with an `n` suffix.
 * `Error` instances without a `toJSON` property include their enumerable
 * properties plus `name` and `message`. Errors with `toJSON` keep their custom
 * representation. Other values follow standard `JSON.stringify` behavior. The
 * `space` parameter controls indentation and defaults to `0`.
 *
 * **Gotchas**
 *
 * When the root input is `undefined`, a symbol, or a function, `formatJson`
 * returns `"null"` instead of the `undefined` returned by `JSON.stringify`.
 * Nested values retain standard `JSON.stringify` behavior.
 *
 * **Example** (Formatting compact JSON)
 *
 * ```ts import.meta.vitest
 * import { Formatter } from "effect"
 *
 * Formatter.formatJson({ name: "Alice", age: 30 }) // => "{\"name\":\"Alice\",\"age\":30}"
 * ```
 *
 * **Example** (Handling circular references)
 *
 * ```ts import.meta.vitest
 * import { Formatter } from "effect"
 *
 * const obj: any = { name: "test" }
 * obj.self = obj
 * Formatter.formatJson(obj) // => "{\"name\":\"test\"}"
 * ```
 *
 * **Example** (Pretty-printed JSON)
 *
 * ```ts import.meta.vitest
 * import { Formatter } from "effect"
 *
 * const output = Formatter.formatJson({ name: "Alice", age: 30 }, { space: 2 })
 * output // => "{\n  \"name\": \"Alice\",\n  \"age\": 30\n}"
 * ```
 *
 * @see {@link format}
 * @see {@link Formatter}
 * @stability stable
 * @category serialization
 * @since 4.0.0
 */
export function formatJson(input: unknown, options?: {
  readonly space?: number | string | undefined
}): string {
  const ancestors: Array<object> = []
  const sources = new WeakMap<object, object>()
  return JSON.stringify(
    input,
    function(this: object, key: string, value: unknown) {
      const original = Object.getOwnPropertyDescriptor(sources.get(this) ?? this, key)?.value
      const redacted = Predicate.hasProperty(original, symbolRedactable)
        ? redact(original)
        : redact(value)
      if (typeof redacted === "bigint") {
        return format(redacted)
      }
      if (typeof redacted !== "object" || redacted === null) {
        return redacted
      }
      const current = redacted instanceof Error && !Predicate.hasProperty(redacted, "toJSON")
        ? { ...redacted, name: redacted.name, message: redacted.message }
        : redacted
      while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
        ancestors.pop()
      }
      if (ancestors.includes(redacted)) {
        return undefined // circular reference
      }
      ancestors.push(redacted)
      if (current !== redacted) {
        ancestors.push(current)
      }
      // Leave boxed primitives intact so JSON.stringify can unbox them natively.
      if (!hasGetter(current) || isJsonPrimitiveWrapper(current)) {
        return current
      }
      const view = redactingView(current)
      sources.set(view, current)
      ancestors.push(view)
      return view
    },
    options?.space
  ) ?? "null"
}

function hasGetter(object: object): boolean {
  for (const key of Object.getOwnPropertyNames(object)) {
    if (Object.getOwnPropertyDescriptor(object, key)?.get !== undefined) {
      return true
    }
  }
  return false
}

// JSON.stringify reads a getter once, then calls toJSON on the result before
// the replacer sees it, so getter results are redacted at the read. A Proxy
// would do, but not every engine has one, so each key becomes a getter that
// reads the source lazily, with the source as receiver.
function redactingView(object: object): object {
  const view = Array.isArray(object) ? [] : {}
  // JSON.stringify reads every array index, regardless of enumerability
  const keys = Array.isArray(object)
    ? Array.from({ length: object.length }, (_, i) => String(i))
    : Object.keys(object)
  for (const key of keys) {
    Object.defineProperty(view, key, {
      enumerable: true,
      get: () => {
        const value = Reflect.get(object, key)
        return Object.getOwnPropertyDescriptor(object, key)?.get !== undefined ? redact(value) : value
      }
    })
  }
  return view
}

function isJsonPrimitiveWrapper(object: object): boolean {
  // Built-in valueOf checks internal slots across realms without calling user code.
  for (const valueOf of [Number.prototype.valueOf, Boolean.prototype.valueOf, String.prototype.valueOf]) {
    try {
      Reflect.apply(valueOf, object, [])
      return true
    } catch {
      // Try the next wrapper type.
    }
  }
  return false
}
