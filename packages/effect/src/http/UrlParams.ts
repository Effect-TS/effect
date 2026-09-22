/**
 * Models URL query parameters as ordered string pairs.
 *
 * `UrlParams` is used for HTTP client query strings, URL-encoded form bodies,
 * and server-side decoding. Values can be built from records, iterables, or
 * native `URLSearchParams`, then updated, serialized, converted to a `URL`, or
 * decoded with schemas.
 *
 * @unstable
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
import * as Option from "../Option.ts"
import type { Pipeable } from "../Pipeable.ts"
import { hasProperty } from "../Predicate.ts"
import type { ReadonlyRecord } from "../Record.ts"

const TypeId = "~effect/http/UrlParams"
const EncodedValue = Symbol.for("~effect/http/UrlParams/EncodedValue")

const encodedValue = (pair: object): string | undefined =>
  hasProperty(pair, EncodedValue) && typeof pair[EncodedValue] === "string" ? pair[EncodedValue] : undefined

const encode = (value: string): string => new URLSearchParams([["", value]]).toString().slice(1)

const withEncodedValue = <A extends object>(pair: A, value: string | undefined): A => {
  if (value !== undefined) {
    Object.defineProperty(pair, EncodedValue, { value })
  }
  return pair
}

/**
 * Immutable collection of URL query parameters.
 *
 * **Details**
 *
 * Parameters are stored as ordered string key-value pairs and can contain multiple
 * values for the same key.
 *
 * @unstable
 * @category models
 * @since 4.0.0
 */
export interface UrlParams extends Pipeable, Inspectable, Iterable<readonly [string, string]> {
  readonly [TypeId]: typeof TypeId
  readonly params: ReadonlyArray<readonly [string, string]>
}

/**
 * Returns `true` when a value is a `UrlParams` instance.
 *
 * @unstable
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
 * @unstable
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
 * Primitive value that can be converted into a URL parameter string.
 *
 * **Gotchas**
 *
 * `undefined` values are skipped when constructing from input.
 *
 * @unstable
 * @category models
 * @since 4.0.0
 */
export type Coercible = string | number | bigint | boolean | null | undefined

/**
 * @unstable
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
 * @unstable
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
 * Creates `UrlParams` from ordered string key-value pairs.
 *
 * **Details**
 *
 * The input pairs are used as-is and are not coerced or normalized.
 *
 * @unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (params: ReadonlyArray<readonly [string, string]>): UrlParams => {
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
 * With `arrayFormat: "comma"`, array elements are encoded separately and joined
 * with literal commas. Decoded accessors still return the joined string, while
 * serialization preserves the difference between delimiter and data commas.
 * Empty arrays are omitted. Existing `UrlParams` inputs are returned unchanged.
 *
 * **Example** (Comma-separated array parameters)
 *
 * ```ts import.meta.vitest
 * import { UrlParams } from "effect/http"
 *
 * const params = UrlParams.fromInput({ tags: ["a,b", "c"] }, { arrayFormat: "comma" })
 * UrlParams.toString(params) // => "tags=a%2Cb,c"
 * UrlParams.getAll(params, "tags") // => ["a,b,c"]
 * ```
 *
 * @unstable
 * @category constructors
 * @since 4.0.0
 */
export const fromInput = (input: Input, options?: {
  readonly arrayFormat?: "repeat" | "comma" | undefined
}): UrlParams => {
  if (isUrlParams(input)) {
    return input
  }
  const parsed = fromInputNested(input, options?.arrayFormat === "comma")
  const out: Array<[string, string]> = []
  for (let i = 0; i < parsed.length; i++) {
    if (Array.isArray(parsed[i][0])) {
      const [keys, value] = parsed[i] as [Array<string>, string]
      const pair: [string, string] = [`${keys[0]}[${keys.slice(1).join("][")}]`, value]
      out.push(withEncodedValue(pair, encodedValue(parsed[i])))
    } else {
      out.push(parsed[i] as [string, string])
    }
  }
  return make(out)
}

const fromInputNested = (input: Input, comma = false): Array<[string | Array<string>, any]> => {
  const entries = typeof (input as any)[Symbol.iterator] === "function"
    ? Arr.fromIterable(input as Iterable<readonly [string, Coercible]>)
    : Object.entries(input)
  const out: Array<[string | Array<string>, string]> = []
  for (const entry of entries) {
    const [key, value] = entry
    const encoded = encodedValue(entry)
    if (encoded !== undefined) {
      out.push(entry as [string, string])
    } else if (Array.isArray(value) && comma) {
      const values = value.filter((item) => item !== undefined).map(String)
      if (values.length > 0) {
        const pair: [string, string] = [key, values.join(",")]
        out.push(withEncodedValue(pair, values.map(encode).join(",")))
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== undefined) {
          out.push([key, String(value[i])])
        }
      }
    } else if (value !== null && typeof value === "object") {
      const nested = fromInputNested(value as CoercibleRecord, comma)
      for (const pair of nested) {
        const [k, v] = pair
        const next: [Array<string>, string] = [[key, ...(typeof k === "string" ? [k] : k)], v]
        out.push(withEncodedValue(next, encodedValue(pair)))
      }
    } else if (value !== undefined) {
      out.push([key, String(value)])
    }
  }
  return out
}

/**
 * Provides an order-sensitive `Equivalence` instance for `UrlParams`.
 *
 * **Details**
 *
 * Two values are equivalent when they contain the same key-value pairs in the same
 * order and use the same value encoding.
 *
 * @unstable
 * @category instances
 * @since 4.0.0
 */
export const Equivalence: Equ.Equivalence<UrlParams> = Equ.make<UrlParams>((a, b) =>
  arrayEquivalence(a.params, b.params)
)

const arrayEquivalence = Arr.makeEquivalence(
  (a: readonly [string, string], b: readonly [string, string]) =>
    a[0] === b[0] && a[1] === b[1] && (encodedValue(a) ?? encode(a[1])) === (encodedValue(b) ?? encode(b[1]))
)

/**
 * An empty `UrlParams` value.
 *
 * @unstable
 * @category constructors
 * @since 4.0.0
 */
export const empty: UrlParams = make([])

/**
 * Returns all values for a query parameter key in insertion order.
 *
 * **Details**
 *
 * Returns an empty array when the key is absent.
 *
 * @unstable
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
        acc.push(value)
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
 * Returns `Option.none` when the key is absent.
 *
 * @unstable
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
      Option.map(([, value]) => value)
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
 * Returns `Option.none` when the key is absent.
 *
 * @unstable
 * @category combinators
 * @since 4.0.0
 */
export const getLast: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual(2, (self: UrlParams, key: string): Option.Option<string> =>
  Arr.findLast(self.params, ([k]) => k === key).pipe(
    Option.map(([, value]) => value)
  ))

/**
 * Sets a query parameter to a single value.
 *
 * **Details**
 *
 * Existing values for the same key are removed, and the new value is appended to
 * the end.
 *
 * @unstable
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
      [key, String(value)]
    )
  ))

/**
 * Transforms the underlying ordered key-value pairs of `UrlParams`.
 *
 * **Details**
 *
 * The result is wrapped in a new `UrlParams` value. Retaining a pair also retains
 * its array encoding. Rebuilding a pair from its decoded strings uses ordinary
 * string encoding, since the original array boundaries are no longer available.
 *
 * @unstable
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
 * @unstable
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
 * @unstable
 * @category combinators
 * @since 4.0.0
 */
export const append: {
  (key: string, value: Coercible): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: Coercible): UrlParams
} = dual(3, (self: UrlParams, key: string, value: Coercible): UrlParams =>
  make(Arr.append(
    self.params,
    [key, String(value)]
  )))

/**
 * Appends all query parameters produced from the supplied input.
 *
 * **Details**
 *
 * Existing parameters are preserved.
 *
 * @unstable
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
 * @unstable
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
 * @unstable
 * @category converting
 * @since 4.0.0
 */
export const toString = (input: Input): string => {
  const params = fromInput(input).params
  if (!params.some((pair) => encodedValue(pair) !== undefined)) {
    return new URLSearchParams(params as any).toString()
  }
  return params.map((pair) => `${encode(pair[0])}=${encodedValue(pair) ?? encode(pair[1])}`).join("&")
}

/**
 * Builds a `Record` containing all the key-value pairs in the given `UrlParams`
 * as `string` (if only one value for a key) or a `NonEmptyArray<string>`
 * (when more than one value for a key)
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
 * @unstable
 * @category converting
 * @since 4.0.0
 */
export const toRecord = (self: UrlParams): Record<string, string | Arr.NonEmptyArray<string>> => {
  const out: Record<string, string | Arr.NonEmptyArray<string>> = {}
  for (const [k, value] of self.params) {
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
 * non-empty readonly array of strings.
 *
 * @unstable
 * @category converting
 * @since 4.0.0
 */
export const toReadonlyRecord: (self: UrlParams) => ReadonlyRecord<string, string | Arr.NonEmptyReadonlyArray<string>> =
  toRecord as any
