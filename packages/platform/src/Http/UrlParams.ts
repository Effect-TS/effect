/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"

/**
 * @since 1.0.0
 * @category models
 */
export interface UrlParams extends ReadonlyArray<readonly [string, string]> {}

/**
 * @since 1.0.0
 * @category models
 */
export type Input = Readonly<Record<string, string>> | Iterable<readonly [string, string]> | URLSearchParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput = (input: Input): UrlParams => {
  if (Symbol.iterator in input) {
    return ReadonlyArray.fromIterable(input)
  }
  return ReadonlyArray.fromIterable(Object.entries(input))
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema: Schema.Schema<UrlParams, ReadonlyArray<readonly [string, string]>> = Schema.Array(
  Schema.Tuple(Schema.String, Schema.String)
).pipe(
  Schema.identifier("UrlParams")
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: UrlParams = []

/**
 * @since 1.0.0
 * @category combinators
 */
export const getAll: {
  (key: string): (self: UrlParams) => ReadonlyArray<string>
  (self: UrlParams, key: string): ReadonlyArray<string>
} = dual<
  (key: string) => (self: UrlParams) => ReadonlyArray<string>,
  (self: UrlParams, key: string) => ReadonlyArray<string>
>(2, (self, key) =>
  ReadonlyArray.reduce(self, [] as Array<string>, (acc, [k, value]) => {
    if (k === key) {
      acc.push(value)
    }
    return acc
  }))

/**
 * @since 1.0.0
 * @category combinators
 */
export const getFirst: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual<
  (key: string) => (self: UrlParams) => Option.Option<string>,
  (self: UrlParams, key: string) => Option.Option<string>
>(2, (self, key) =>
  Option.map(
    ReadonlyArray.findFirst(
      self,
      ([k]) => k === key
    ),
    ([, value]) => value
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const getLast: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual<
  (key: string) => (self: UrlParams) => Option.Option<string>,
  (self: UrlParams, key: string) => Option.Option<string>
>(2, (self, key) =>
  Option.map(
    ReadonlyArray.findLast(
      self,
      ([k]) => k === key
    ),
    ([, value]) => value
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const set: {
  (key: string, value: string): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: string): UrlParams
} = dual<
  (key: string, value: string) => (self: UrlParams) => UrlParams,
  (self: UrlParams, key: string, value: string) => UrlParams
>(3, (self, key, value) =>
  ReadonlyArray.append(
    ReadonlyArray.filter(self, ([k]) => k !== key),
    [key, value]
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const setAll: {
  (input: Input): (self: UrlParams) => UrlParams
  (self: UrlParams, input: Input): UrlParams
} = dual<
  (input: Input) => (self: UrlParams) => UrlParams,
  (self: UrlParams, input: Input) => UrlParams
>(2, (self, input) => {
  const toSet = fromInput(input)
  const keys = toSet.map(([k]) => k)
  return ReadonlyArray.appendAll(
    ReadonlyArray.filter(self, ([k]) => keys.includes(k)),
    toSet
  )
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const append: {
  (key: string, value: string): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: string): UrlParams
} = dual<
  (key: string, value: string) => (self: UrlParams) => UrlParams,
  (self: UrlParams, key: string, value: string) => UrlParams
>(3, (self, key, value) =>
  ReadonlyArray.append(
    self,
    [key, value]
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendAll: {
  (input: Input): (self: UrlParams) => UrlParams
  (self: UrlParams, input: Input): UrlParams
} = dual<
  (input: Input) => (self: UrlParams) => UrlParams,
  (self: UrlParams, input: Input) => UrlParams
>(2, (self, input) =>
  ReadonlyArray.appendAll(
    self,
    fromInput(input)
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const remove: {
  (key: string): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string): UrlParams
} = dual<
  (key: string) => (self: UrlParams) => UrlParams,
  (self: UrlParams, key: string) => UrlParams
>(2, (self, key) => ReadonlyArray.filter(self, ([k]) => k !== key))

/**
 * @since 1.0.0
 * @category combinators
 */
export const toString = (self: UrlParams): string => new URLSearchParams(self as any).toString()

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeUrl = <E>(url: string, params: UrlParams, onError: (e: unknown) => E): Effect.Effect<URL, E> =>
  Effect.try({
    try: () => {
      const urlInstance = new URL(url, baseUrl())
      ReadonlyArray.forEach(params, ([key, value]) => {
        if (value !== undefined) {
          urlInstance.searchParams.append(key, value)
        }
      })
      return urlInstance
    },
    catch: onError
  })

export const baseUrl = (): string | undefined => {
  // Need to check both "in" and "undefined" for location to support Deno.
  // As Deno has "globalThis.location" defined but with value "undefined" by default.
  // See https://docs.deno.com/runtime/manual/runtime/location_api
  if ("location" in globalThis && globalThis.location !== undefined) {
    return location.origin + location.pathname
  }
  return undefined
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined): {
  (
    field: string
  ): (self: UrlParams) => Effect.Effect<A, ParseResult.ParseError, R>
  (
    self: UrlParams,
    field: string
  ): Effect.Effect<A, ParseResult.ParseError, R>
} => {
  const parse = Schema.decodeUnknown(Schema.parseJson(schema), options)
  return dual<
    (field: string) => (self: UrlParams) => Effect.Effect<A, ParseResult.ParseError, R>,
    (self: UrlParams, field: string) => Effect.Effect<A, ParseResult.ParseError, R>
  >(2, (self, field) => parse(Option.getOrElse(getLast(self, field), () => "")))
}
