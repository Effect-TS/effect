/**
 * @since 1.0.0
 */
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"

/**
 * @since 1.0.0
 * @category models
 */
export interface UrlParams extends Chunk.Chunk<[string, string]> {}

/**
 * @since 1.0.0
 * @category models
 */
export type Input = UrlParams | Readonly<Record<string, string>> | Iterable<readonly [string, string]> | URLSearchParams

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput = (input: Input): UrlParams => {
  if (Chunk.isChunk(input)) {
    return input
  } else if (Symbol.iterator in input) {
    return Chunk.fromIterable(input) as UrlParams
  }
  return Chunk.fromIterable(Object.entries(input))
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: UrlParams = Chunk.empty()

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
  Chunk.append(
    Chunk.filter(self, ([k]) => k !== key),
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
  const keys = Chunk.toReadonlyArray(toSet).map(([k]) => k)
  return Chunk.appendAll(
    Chunk.filter(self, ([k]) => keys.includes(k)),
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
  Chunk.append(
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
  Chunk.appendAll(
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
>(2, (self, key) => Chunk.filter(self, ([k]) => k !== key))

/**
 * @since 1.0.0
 * @category combinators
 */
export const toString = (self: UrlParams): string => new URLSearchParams(Chunk.toReadonlyArray(self) as any).toString()

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeUrl = <E>(url: string, params: UrlParams, onError: (e: unknown) => E): Effect.Effect<never, E, URL> =>
  Effect.try({
    try: () => {
      const urlInstance = new URL(url, baseUrl())
      Chunk.forEach(params, ([key, value]) => {
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
