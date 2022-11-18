/**
 * @since 1.0.0
 */
import * as arbitrary from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import { ArbitraryId, GuardId, JsonDecoderId, ShowId } from "@fp-ts/codec/internal/Interpreter"
import * as S from "@fp-ts/codec/Schema"
import * as show from "@fp-ts/codec/Show"
import type * as support from "@fp-ts/codec/Support"

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
export const Support: support.Support = new Map([
  [GuardId, new Map<symbol, Function>([[id, () => Guard]])],
  [ArbitraryId, new Map<symbol, Function>([[id, () => Arbitrary]])],
  [ShowId, new Map<symbol, Function>([[id, () => Show]])],
  [JsonDecoderId, new Map<symbol, Function>([[id, () => Decoder]])]
])

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<Json> = S.declare(id, Support)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<Json> = G.make(
  Schema,
  (u: unknown): u is Json =>
    u === null || G.string.is(u) || G.number.is(u) || G.boolean.is(u) ||
    (Array.isArray(u) && u.every(Guard.is)) ||
    (typeof u === "object" && Object.keys(u).every((key) => Guard.is(u[key])))
)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, Json> = D.fromGuard(
  Guard,
  (u) => DE.notType("Json", u)
)

/**
 * @since 1.0.0
 */
export const JsonArrayDecoder: D.Decoder<Json, JsonArray> = D.make(
  S.array(true, Schema),
  (json) => Array.isArray(json) ? D.succeed(json) : D.fail(DE.notType("Array", json))
)

/**
 * @since 1.0.0
 */
export const JsonObjectDecoder: D.Decoder<Json, JsonObject> = D.make(
  S.indexSignature(Schema),
  (json) =>
    typeof json === "object" && json != null && !Array.isArray(json) ?
      D.succeed(json as JsonObject) :
      D.fail(DE.notType("Object", json))
)

/**
 * @since 1.0.0
 */
export const Arbitrary: arbitrary.Arbitrary<Json> = arbitrary.make(
  Schema,
  (fc) => fc.jsonValue().map((json) => json as Json)
)

/**
 * @since 1.0.0
 */
export const Show: show.Show<Json> = show.make(
  Schema,
  (json) => JSON.stringify(json)
)
