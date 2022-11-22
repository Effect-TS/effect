/**
 * @since 1.0.0
 */
import type * as A from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import type * as D from "@fp-ts/codec/Decoder"
import type * as G from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type * as S from "@fp-ts/codec/Schema"
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

const Guard: G.Guard<Json> = I.makeGuard(
  Schema,
  (u): u is Json =>
    u === null || typeof u === "string" || typeof u === "number" || typeof u === "boolean" ||
    (Array.isArray(u) && u.every(Guard.is)) ||
    (typeof u === "object" && u !== null && Object.keys(u).every((key) => Guard.is(u[key])))
)

const Decoder: D.Decoder<unknown, Json> = I.fromGuard(Guard, (u) => DE.notType("Json", u))

const Arbitrary: A.Arbitrary<Json> = I.makeArbitrary(
  Schema,
  (fc) => fc.jsonValue().map((json) => json as Json)
)

const Show: Sh.Show<Json> = I.makeShow(Schema, (json) => JSON.stringify(json))
