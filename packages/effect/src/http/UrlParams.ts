/**
 * Models URL query parameters as ordered pairs with string or redacted values.
 *
 * `UrlParams` is used for HTTP client query strings, URL-encoded form bodies,
 * and server-side decoding. Values can be built from records, iterables, or
 * native `URLSearchParams`, then updated, serialized, converted to a `URL`, or
 * decoded with schemas.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as Equal from "../Equal.ts"
import * as Equ from "../Equivalence.ts"
import { dual } from "../Function.ts"
import * as Hash from "../Hash.ts"
import type { Inspectable } from "../Inspectable.ts"
import { PipeInspectableProto } from "../internal/core.ts"
import * as InternalRecord from "../internal/record.ts"
import { stringOrRedacted } from "../internal/redacted.ts"
import * as Option from "../Option.ts"
import type { Pipeable } from "../Pipeable.ts"
import { hasProperty } from "../Predicate.ts"
import type { ReadonlyRecord } from "../Record.ts"
import * as Redacted from "../Redacted.ts"
import * as Tuple from "../Tuple.ts"

const TypeId = "~effect/http/UrlParams"

/**
 * Immutable collection of URL query parameters.
 *
 * **Details**
 *
 * Parameters are stored as ordered key-value pairs and can contain multiple
 * values for the same key. Redacted values retain their wrappers so HTTP client
 * traces can hide them while outgoing requests send their underlying strings.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface UrlParams extends Pipeable, Inspectable, Iterable<readonly [string, Value]> {
  readonly [TypeId]: typeof TypeId
  readonly params: ReadonlyArray<readonly [string, Value]>
}

/**
 * Stored URL parameter value, optionally redacted for inspection and HTTP client tracing.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Value = string | Redacted.Redacted<string>

/**
 * Returns `true` when a value is a `UrlParams` instance.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.0
 */
export const isUrlParams = (u: unknown): u is UrlParams => hasProperty(u, TypeId)

/**
 * Input accepted when constructing `UrlParams`.
 *
 * **Details**
 *
 * Values can be provided as a coercible record, an iterable of key-value pairs, or
 * a native `URLSearchParams` value.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Input =
  | UrlParams
  | CoercibleRecordInput
  | Iterable<readonly [string, Coercible]>
  | URLSearchParams

type CoercibleRecordInput = CoercibleRecord & {
  readonly [Symbol.iterator]?: never
}

/**
 * Primitive or redacted string value accepted as a URL parameter.
 *
 * **Gotchas**
 *
 * `undefined` values are skipped when constructing from input.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Coercible = Value | number | bigint | boolean | null | undefined

/**
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
type CoercibleRecordField<A> = A extends Coercible ? A
  : A extends ReadonlyArray<infer Item> ? ReadonlyArray<Item extends Coercible ? Item : never>
  : A extends object ? CoercibleRecord<A>
  : never

/**
 * Record input whose fields can be coerced into URL parameter values.
 *
 * **Details**
 *
 * Nested records are rendered using bracket notation, and arrays produce repeated
 * parameters.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type CoercibleRecord<A extends object = any> = {
  readonly [K in keyof A]: CoercibleRecordField<A[K]>
}

const Proto = {
  ...PipeInspectableProto,
  [TypeId]: TypeId,
  [Symbol.iterator](this: UrlParams) {
    return this.params[Symbol.iterator]()
  },
  toJSON(this: UrlParams): unknown {
    return {
      _id: "UrlParams",
      params: Object.fromEntries(this.params)
    }
  },
  [Equal.symbol](this: UrlParams, that: UrlParams): boolean {
    return Equivalence(this, that)
  },
  [Hash.symbol](this: UrlParams): number {
    return Hash.array(this.params.flat())
  }
}

/**
 * Creates `UrlParams` from ordered key-value pairs with string or redacted values.
 *
 * **Details**
 *
 * The input pairs are used as-is and are not coerced or normalized.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (params: ReadonlyArray<readonly [string, Value]>): UrlParams => {
  const self = Object.create(Proto)
  self.params = params
  return self
}

/**
 * Creates `UrlParams` from a supported input shape.
 *
 * **Details**
 *
 * Primitive values are converted to strings, arrays produce repeated parameters,
 * nested records use bracket notation, and `undefined` values are omitted.
 * Redacted strings retain their wrappers.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromInput = (input: Input): UrlParams => {
  if (isUrlParams(input)) {
    return input
  }
  const parsed = fromInputNested(input)
  const out: Array<[string, Value]> = []
  for (let i = 0; i < parsed.length; i++) {
    if (Array.isArray(parsed[i][0])) {
      const [keys, value] = parsed[i] as [Array<string>, Value]
      out.push([`${keys[0]}[${keys.slice(1).join("][")}]`, value])
    } else {
      out.push(parsed[i] as [string, Value])
    }
  }
  return make(out)
}

const fromInputNested = (input: Input): Array<[string | Array<string>, Value]> => {
  const entries = typeof (input as any)[Symbol.iterator] === "function"
    ? Arr.fromIterable(input as Iterable<readonly [string, Coercible]>)
    : Object.entries(input)
  const out: Array<[string | Array<string>, Value]> = []
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== undefined) {
          out.push([key, coerce(value[i])])
        }
      }
    } else if (Redacted.isRedacted(value)) {
      out.push([key, value as Redacted.Redacted<string>])
    } else if (value !== null && typeof value === "object") {
      const nested = fromInputNested(value as CoercibleRecord)
      for (const [k, v] of nested) {
        out.push([[key, ...(typeof k === "string" ? [k] : k)], v])
      }
    } else if (value !== undefined) {
      out.push([key, String(value)])
    }
  }
  return out
}

const coerce = (value: Coercible): Value => Redacted.isRedacted(value) ? value : String(value)

/**
 * Provides an order-sensitive `Equivalence` instance for `UrlParams`.
 *
 * **Details**
 *
 * Two values are equivalent when they contain the same key-value pairs in the same
 * order.
 *
 * @stability unstable
 * @category instances
 * @since 4.0.0
 */
export const Equivalence: Equ.Equivalence<UrlParams> = Equ.mapInput(
  Arr.makeEquivalence(Tuple.makeEquivalence([Equ.strictEqual<string>(), Equal.equals<Value, Value>])),
  (self: UrlParams) => self.params
)

/**
 * An empty `UrlParams` value.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const empty: UrlParams = make([])

/**
 * Returns all values for a query parameter key in insertion order.
 *
 * **Details**
 *
 * Returns an empty array when the key is absent. Redacted values are unwrapped.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const getAll: {
  (key: string): (self: UrlParams) => ReadonlyArray<string>
  (self: UrlParams, key: string): ReadonlyArray<string>
} = dual(
  2,
  (self: UrlParams, key: string): ReadonlyArray<string> =>
    Arr.reduce(self.params, [] as Array<string>, (acc, [k, value]) => {
      if (k === key) {
        acc.push(stringOrRedacted(value))
      }
      return acc
    })
)

/**
 * Returns the first value for a query parameter key safely.
 *
 * **When to use**
 *
 * Use when duplicate query parameters are ordered and the first occurrence has
 * precedence.
 *
 * **Details**
 *
 * Returns `Option.none` when the key is absent. Redacted values are unwrapped.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const getFirst: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual(
  2,
  (self: UrlParams, key: string): Option.Option<string> =>
    Arr.findFirst(self.params, ([k]) => k === key).pipe(
      Option.map(([, value]) => stringOrRedacted(value))
    )
)

/**
 * Returns the last value for a query parameter key safely.
 *
 * **When to use**
 *
 * Use when duplicate query parameters are ordered and the last occurrence has
 * precedence.
 *
 * **Details**
 *
 * Returns `Option.none` when the key is absent. Redacted values are unwrapped.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const getLast: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual(2, (self: UrlParams, key: string): Option.Option<string> =>
  Arr.findLast(self.params, ([k]) => k === key).pipe(
    Option.map(([, value]) => stringOrRedacted(value))
  ))

/**
 * Sets a query parameter to a single value.
 *
 * **Details**
 *
 * Existing values for the same key are removed, and the new value is appended to
 * the end.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const set: {
  (key: string, value: Coercible): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: Coercible): UrlParams
} = dual(3, (self: UrlParams, key: string, value: Coercible): UrlParams =>
  make(
    Arr.append(
      Arr.filter(self.params, ([k]) => k !== key),
      [key, coerce(value)]
    )
  ))

/**
 * Transforms the underlying ordered key-value pairs of `UrlParams`.
 *
 * **Details**
 *
 * The result is wrapped in a new `UrlParams` value.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const transform: {
  (f: (params: UrlParams["params"]) => UrlParams["params"]): (self: UrlParams) => UrlParams
  (self: UrlParams, f: (params: UrlParams["params"]) => UrlParams["params"]): UrlParams
} = dual(
  2,
  (self: UrlParams, f: (params: UrlParams["params"]) => UrlParams["params"]): UrlParams => make(f(self.params))
)

/**
 * Sets multiple query parameters from input.
 *
 * **Details**
 *
 * Keys present in the input replace existing values for those keys, while
 * unmentioned existing parameters are preserved.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const setAll: {
  (input: Input): (self: UrlParams) => UrlParams
  (self: UrlParams, input: Input): UrlParams
} = dual(2, (self: UrlParams, input: Input): UrlParams => {
  const params = fromInput(input).params.slice()
  const keys = new Set()
  for (let i = 0; i < params.length; i++) {
    keys.add(params[i][0])
  }
  for (let i = 0; i < self.params.length; i++) {
    if (keys.has(self.params[i][0])) continue
    params.push(self.params[i])
  }
  return make(params)
})

/**
 * Appends a query parameter value without removing existing values for the key.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const append: {
  (key: string, value: Coercible): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: Coercible): UrlParams
} = dual(3, (self: UrlParams, key: string, value: Coercible): UrlParams =>
  make(Arr.append(
    self.params,
    [key, coerce(value)]
  )))

/**
 * Appends all query parameters produced from the supplied input.
 *
 * **Details**
 *
 * Existing parameters are preserved.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const appendAll: {
  (input: Input): (self: UrlParams) => UrlParams
  (self: UrlParams, input: Input): UrlParams
} = dual(2, (self: UrlParams, input: Input): UrlParams => transform(self, Arr.appendAll(fromInput(input).params)))

/**
 * Removes all query parameter values for the specified key.
 *
 * @stability unstable
 * @category combinators
 * @since 4.0.0
 */
export const remove: {
  (key: string): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string): UrlParams
} = dual(2, (self: UrlParams, key: string): UrlParams => transform(self, Arr.filter(([k]) => k !== key)))

/**
 * Serializes `UrlParams` to a URL query string without a leading question mark.
 *
 * **Details**
 *
 * Redacted values are unwrapped for transmission.
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const toString = (input: Input): string =>
  new URLSearchParams(fromInput(input).params.map(([key, value]) => [key, stringOrRedacted(value)])).toString()

/**
 * Builds a `Record` containing all the key-value pairs in the given `UrlParams`
 * as `string` (if only one value for a key) or a `NonEmptyArray<string>`
 * (when more than one value for a key)
 *
 * **Details**
 *
 * Redacted values are unwrapped.
 *
 * **Example** (Converting parameters to a record)
 *
 * ```ts import.meta.vitest
 * import { UrlParams } from "effect/http"
 *
 * const urlParams = UrlParams.fromInput({
 *   a: 1,
 *   b: true,
 *   c: "string",
 *   e: [1, 2, 3]
 * })
 * UrlParams.toRecord(urlParams) // => { a: "1", b: "true", c: "string", e: ["1", "2", "3"] }
 * ```
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const toRecord = (self: UrlParams): Record<string, string | Arr.NonEmptyArray<string>> => {
  const out: Record<string, string | Arr.NonEmptyArray<string>> = {}
  for (const [k, param] of self.params) {
    const value = stringOrRedacted(param)
    if (!Object.hasOwn(out, k)) {
      InternalRecord.assignProperty(out, k, value)
    } else {
      const current = out[k]
      if (typeof current === "string") {
        InternalRecord.assignProperty(out, k, [current, value])
      } else {
        current.push(value)
      }
    }
  }
  return out
}

/**
 * Builds a readonly record from `UrlParams`.
 *
 * **Details**
 *
 * Keys with one value map to a string, and keys with multiple values map to a
 * non-empty readonly array of strings. Redacted values are unwrapped.
 *
 * @stability unstable
 * @category converting
 * @since 4.0.0
 */
export const toReadonlyRecord: (self: UrlParams) => ReadonlyRecord<string, string | Arr.NonEmptyReadonlyArray<string>> =
  toRecord as any
