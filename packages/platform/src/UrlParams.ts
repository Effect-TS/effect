/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Arr from "effect/Array"
import type * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { dual } from "effect/Function"
import * as Option from "effect/Option"

/**
 * @since 1.0.0
 * @category models
 */
export interface UrlParams extends ReadonlyArray<readonly [string, string]> {}

/**
 * @since 1.0.0
 * @category models
 */
export type Input =
  | Readonly<Record<string, Coercible | ReadonlyArray<Coercible>>>
  | Iterable<readonly [string, Coercible]>
  | URLSearchParams

/**
 * @since 1.0.0
 * @category models
 */
export type Coercible = string | number | bigint | boolean | null | undefined

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput = (input: Input): UrlParams => {
  const entries = Symbol.iterator in input ? Arr.fromIterable(input) : Object.entries(input)
  const out: Array<readonly [string, string]> = []
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] !== undefined) {
          out.push([key, String(value[i])])
        }
      }
    } else if (value !== undefined) {
      out.push([key, String(value)])
    }
  }
  return out
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const schema: Schema.Schema<UrlParams, ReadonlyArray<readonly [string, string]>> = Schema.Array(
  Schema.Tuple(Schema.String, Schema.String)
).annotations({ identifier: "UrlParams" })

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
} = dual(
  2,
  (self: UrlParams, key: string): ReadonlyArray<string> =>
    Arr.reduce(self, [] as Array<string>, (acc, [k, value]) => {
      if (k === key) {
        acc.push(value)
      }
      return acc
    })
)

/**
 * @since 1.0.0
 * @category combinators
 */
export const getFirst: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual(2, (self: UrlParams, key: string): Option.Option<string> =>
  Option.map(
    Arr.findFirst(self, ([k]) => k === key),
    ([, value]) => value
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const getLast: {
  (key: string): (self: UrlParams) => Option.Option<string>
  (self: UrlParams, key: string): Option.Option<string>
} = dual(2, (self: UrlParams, key: string): Option.Option<string> =>
  Option.map(
    Arr.findLast(self, ([k]) => k === key),
    ([, value]) => value
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const set: {
  (key: string, value: Coercible): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: Coercible): UrlParams
} = dual(3, (self: UrlParams, key: string, value: Coercible): UrlParams =>
  Arr.append(
    Arr.filter(self, ([k]) => k !== key),
    [key, String(value)]
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const setAll: {
  (input: Input): (self: UrlParams) => UrlParams
  (self: UrlParams, input: Input): UrlParams
} = dual(2, (self: UrlParams, input: Input): UrlParams => {
  const toSet = fromInput(input)
  const keys = toSet.map(([k]) => k)
  return Arr.appendAll(
    Arr.filter(self, ([k]) => keys.includes(k)),
    toSet
  )
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const append: {
  (key: string, value: Coercible): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string, value: Coercible): UrlParams
} = dual(3, (self: UrlParams, key: string, value: Coercible): UrlParams =>
  Arr.append(
    self,
    [key, String(value)]
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const appendAll: {
  (input: Input): (self: UrlParams) => UrlParams
  (self: UrlParams, input: Input): UrlParams
} = dual(2, (self: UrlParams, input: Input): UrlParams => Arr.appendAll(self, fromInput(input)))

/**
 * @since 1.0.0
 * @category combinators
 */
export const remove: {
  (key: string): (self: UrlParams) => UrlParams
  (self: UrlParams, key: string): UrlParams
} = dual(2, (self: UrlParams, key: string): UrlParams => Arr.filter(self, ([k]) => k !== key))

/**
 * @since 1.0.0
 * @category combinators
 */
export const toString = (self: UrlParams): string => new URLSearchParams(self as any).toString()

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeUrl = (url: string, params: UrlParams, hash: Option.Option<string>): Either.Either<URL, Error> => {
  try {
    const urlInstance = new URL(url, baseUrl())
    for (let i = 0; i < params.length; i++) {
      const [key, value] = params[i]
      if (value !== undefined) {
        urlInstance.searchParams.append(key, value)
      }
    }
    if (hash._tag === "Some") {
      urlInstance.hash = hash.value
    }
    return Either.right(urlInstance)
  } catch (e) {
    return Either.left(e as Error)
  }
}

const baseUrl = (): string | undefined => {
  if (
    "location" in globalThis &&
    globalThis.location !== undefined &&
    globalThis.location.origin !== undefined &&
    globalThis.location.pathname !== undefined
  ) {
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
