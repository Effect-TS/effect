/**
 * @since 1.0.0
 */
import * as H from "@effect/schema/annotation/Hook"
import * as I from "@effect/schema/internal/common"
import type * as S from "@effect/schema/Schema"

/**
 * @since 1.0.0
 */
export type JsonArray = ReadonlyArray<Json>

/**
 * @since 1.0.0
 */
export type JsonObject = { readonly [key: string]: Json }

/**
 * @since 1.0.0
 */
export type Json =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject

/**
 * @since 1.0.0
 */
export const json: S.Schema<Json> = I.lazy(() =>
  I.union(
    I._null,
    I.string,
    I.number,
    I.boolean,
    I.array(json),
    I.record(I.string, json)
  ), {
  [H.ArbitraryHookId]: H.hook(() => Arbitrary)
})

const Arbitrary = I.makeArbitrary<Json>(json, (fc) => fc.jsonValue().map((json) => json as Json))
