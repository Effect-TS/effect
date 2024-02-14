/**
 * @since 1.0.0
 */
import type * as Brand from "effect/Brand"
import { dual } from "effect/Function"
import type * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"
import * as Secret from "effect/Secret"

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
 * @category models
 */
export type Headers = Brand.Branded<ReadonlyRecord.ReadonlyRecord<string>, HeadersTypeId>

/**
 * @since 1.0.0
 * @category models
 */
export type Input = ReadonlyRecord.ReadonlyRecord<string> | Iterable<readonly [string, string]>

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
    return ReadonlyRecord.fromEntries(ReadonlyArray.map(
      ReadonlyArray.fromIterable(input),
      ([k, v]) => [k.toLowerCase(), v] as const
    )) as Headers
  }
  return ReadonlyRecord.fromEntries(
    Object.entries(input).map(([k, v]) => [k.toLowerCase(), v])
  ) as Headers
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeFromRecord = (input: ReadonlyRecord.ReadonlyRecord<string>): Headers => input as Headers

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
>(2, (self, key) => ReadonlyRecord.has(self, key.toLowerCase()))

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
>(2, (self, key) => ReadonlyRecord.get(self, key.toLowerCase()))

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
>(2, (self, key) => ReadonlyRecord.remove(self, key.toLowerCase()) as Headers)

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
  (self, key) =>
    typeof key === "string"
      ? ReadonlyRecord.modify(self, key.toLowerCase(), Secret.fromString)
      : key.reduce<Record<string, string | Secret.Secret>>((headers, key) =>
        ReadonlyRecord.modify(headers, key.toLowerCase(), (value) =>
          typeof value === "string" ? Secret.fromString(value) : value), self)
)
