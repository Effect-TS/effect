/**
 * @since 1.0.0
 */
import * as Chunk from "@effect/data/Chunk"
import { dual } from "@effect/data/Function"

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
export const set = dual<
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
export const setAll = dual<
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
export const append = dual<
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
export const appendAll = dual<
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
export const remove = dual<
  (key: string) => (self: UrlParams) => UrlParams,
  (self: UrlParams, key: string) => UrlParams
>(2, (self, key) => Chunk.filter(self, ([k]) => k !== key))

/**
 * @since 1.0.0
 * @category combinators
 */
export const toString = (self: UrlParams): string => new URLSearchParams(Chunk.toReadonlyArray(self) as any).toString()
