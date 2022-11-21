/**
 * @since 1.0.0
 */
import type * as A from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import * as S from "@fp-ts/codec/Schema"
import type * as Sh from "@fp-ts/codec/Show"
import * as O from "@fp-ts/data/Option"

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
export const id = Symbol.for("@fp-ts/codec/data/Json")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.ShowId]: () => Show,
  [I.DecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<Json> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<Json> = I.makeGuard(
  Schema,
  (u): u is Json =>
    u === null || G.string.is(u) || G.number.is(u) || G.boolean.is(u) ||
    (Array.isArray(u) && u.every(Guard.is)) ||
    (typeof u === "object" && Object.keys(u).every((key) => Guard.is(u[key])))
)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, Json> = I.fromGuard(Guard, (u) => DE.notType("Json", u))

/**
 * @since 1.0.0
 */
export const JsonArrayJsonDecoder: D.Decoder<Json, JsonArray> = I.makeDecoder(
  S.array(Schema),
  (json) => Array.isArray(json) ? D.succeed(json) : D.fail(DE.notType("JsonArray", json))
)

/**
 * @since 1.0.0
 */
export const JsonObjectJsonDecoder: D.Decoder<Json, JsonObject> = I.makeDecoder(
  S.indexSignature(Schema),
  (json) =>
    typeof json === "object" && json != null && !Array.isArray(json) ?
      D.succeed(json as JsonObject) :
      D.fail(DE.notType("JsonObject", json))
)

/**
 * @since 1.0.0
 */
export const Arbitrary: A.Arbitrary<Json> = I.makeArbitrary(
  Schema,
  (fc) => fc.jsonValue().map((json) => json as Json)
)

/**
 * @since 1.0.0
 */
export const Show: Sh.Show<Json> = I.makeShow(Schema, (json) => JSON.stringify(json))
