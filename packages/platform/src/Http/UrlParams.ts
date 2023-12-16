/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
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
 * @category constructors
 */
export const empty: UrlParams = []

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
export const makeUrl = <E>(url: string, params: UrlParams, onError: (e: unknown) => E): Effect.Effect<never, E, URL> =>
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

const baseUrl = (): string | undefined => {
  if ("location" in globalThis) {
    return location.origin + location.pathname
  }
  return undefined
}
