/**
 * @since 1.0.0
 */
import { dual } from "effect/Function"
import type * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as ReadonlyRecord from "effect/ReadonlyRecord"

/**
 * @since 1.0.0
 * @category models
 */
export interface Headers extends ReadonlyRecord.ReadonlyRecord<string> {}

/**
 * @since 1.0.0
 * @category models
 */
export type Input = Headers | Iterable<readonly [string, string]>

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Headers = ReadonlyRecord.empty()

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
    ))
  }
  return ReadonlyRecord.fromEntries(
    Object.entries(input).map(([k, v]) => [k.toLowerCase(), v])
  )
}

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
export const remove: {
  (key: string): (self: Headers) => Headers
  (self: Headers, key: string): Headers
} = dual<
  (key: string) => (self: Headers) => Headers,
  (self: Headers, key: string) => Headers
>(2, (self, key) => ReadonlyRecord.remove(self, key.toLowerCase()))
