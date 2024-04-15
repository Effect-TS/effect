/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as ReadonlyArray from "effect/Array"
import { dual, identity } from "effect/Function"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"
import * as Secret from "effect/Secret"
import * as String from "effect/String"

/**
 * @since 1.0.0
 * @category type ids
 */
export const HeadersTypeId = Symbol.for("@effect/platform/Http/Headers")

/**
 * @since 1.0.0
 * @category type ids
 */
export type HeadersTypeId = typeof HeadersTypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHeaders = (u: unknown): u is Headers => Predicate.hasProperty(u, HeadersTypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface Headers {
  readonly [HeadersTypeId]: HeadersTypeId
  readonly [key: string]: string
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schemaFromSelf: Schema.Schema<Headers> = Schema.declare(isHeaders, {
  identifier: "Headers",
  equivalence: () => Record.getEquivalence(String.Equivalence)
})

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema: Schema.Schema<Headers, Record.ReadonlyRecord<string, string | ReadonlyArray<string>>> =
  Schema.transform(
    Schema.Record(Schema.String, Schema.Union(Schema.String, Schema.Array(Schema.String))),
    schemaFromSelf,
    { decode: (record) => fromInput(record), encode: identity }
  )

/**
 * @since 1.0.0
 * @category models
 */
export type Input =
  | Record.ReadonlyRecord<string, string | ReadonlyArray<string> | undefined>
  | Iterable<readonly [string, string]>

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Headers = Object.create(null) as Headers

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput: (input?: Input) => Headers = (input) => {
  if (input === undefined) {
    return empty
  } else if (Symbol.iterator in input) {
    return Record.fromEntries(ReadonlyArray.map(
      ReadonlyArray.fromIterable(input),
      ([k, v]) => [k.toLowerCase(), v] as const
    )) as Headers
  }
  return Record.fromEntries(
    Object.entries(input).map(([k, v]) =>
      [
        k.toLowerCase(),
        Array.isArray(v) ? v.join(", ") : v
      ] as const
    )
  ) as Headers
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeFromRecord = (input: Record.ReadonlyRecord<string, string>): Headers => input as Headers

/**
 * @since 1.0.0
 * @category combinators
 */
export const has: {
  (key: string): (self: Headers) => boolean
  (self: Headers, key: string): boolean
} = dual<
  (key: string) => (self: Headers) => boolean,
  (self: Headers, key: string) => boolean
>(2, (self, key) => Record.has(self as Record<string, string>, key.toLowerCase()))

/**
 * @since 1.0.0
 * @category combinators
 */
export const get: {
  (key: string): (self: Headers) => Option.Option<string>
  (self: Headers, key: string): Option.Option<string>
} = dual<
  (key: string) => (self: Headers) => Option.Option<string>,
  (self: Headers, key: string) => Option.Option<string>
>(2, (self, key) => Record.get(self as Record<string, string>, key.toLowerCase()))

/**
 * @since 1.0.0
 * @category combinators
 */
export const set: {
  (key: string, value: string): (self: Headers) => Headers
  (self: Headers, key: string, value: string): Headers
} = dual<
  (key: string, value: string) => (self: Headers) => Headers,
  (self: Headers, key: string, value: string) => Headers
>(3, (self, key, value) => ({
  ...self,
  [key.toLowerCase()]: value
}))

/**
 * @since 1.0.0
 * @category combinators
 */
export const setAll: {
  (headers: Input): (self: Headers) => Headers
  (self: Headers, headers: Input): Headers
} = dual<
  (headers: Input) => (self: Headers) => Headers,
  (self: Headers, headers: Input) => Headers
>(2, (self, headers) => ({
  ...self,
  ...fromInput(headers)
}))

/**
 * @since 1.0.0
 * @category combinators
 */
export const merge: {
  (headers: Headers): (self: Headers) => Headers
  (self: Headers, headers: Headers): Headers
} = dual<
  (headers: Headers) => (self: Headers) => Headers,
  (self: Headers, headers: Headers) => Headers
>(2, (self, headers) => ({
  ...self,
  ...headers
}))

/**
 * @since 1.0.0
 * @category combinators
 */
export const remove: {
  (key: string): (self: Headers) => Headers
  (self: Headers, key: string): Headers
} = dual<
  (key: string) => (self: Headers) => Headers,
  (self: Headers, key: string) => Headers
>(2, (self, key) => {
  const out = { ...self }
  delete out[key.toLowerCase()]
  return out
})

/**
 * @since 1.0.0
 */
export const redact: {
  (key: string | ReadonlyArray<string>): (self: Headers) => Record<string, string | Secret.Secret>
  (self: Headers, key: string | ReadonlyArray<string>): Record<string, string | Secret.Secret>
} = dual<
  (key: string | ReadonlyArray<string>) => (self: Headers) => Record<string, string | Secret.Secret>,
  (self: Headers, key: string | ReadonlyArray<string>) => Record<string, string | Secret.Secret>
>(
  2,
  (self, key) => {
    const out: Record<string, string | Secret.Secret> = { ...self }
    const modify = (key: string) => {
      const k = key.toLowerCase()
      if (has(self, k)) {
        out[k] = Secret.fromString(self[k])
      }
    }
    if (Predicate.isString(key)) {
      modify(key)
    } else {
      key.forEach(modify)
    }
    return out
  }
)
