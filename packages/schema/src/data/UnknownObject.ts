/**
 * @since 1.0.0
 */
import * as O from "@fp-ts/data/Option"
import type * as A from "@fp-ts/schema/Arbitrary"
import * as DE from "@fp-ts/schema/DecodeError"
import type * as D from "@fp-ts/schema/Decoder"
import type * as G from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/UnknownIndexSignature")

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.DecoderId]: () => Decoder,
  [I.UnknownDecoderId]: () => Decoder,
  [I.JsonDecoderId]: () => Decoder
})

/**
 * @since 1.0.0
 */
export type UnknownObject = { readonly [_: string]: unknown }

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<UnknownObject> = I.declareSchema(id, O.none, Provider)

const isUnknownObject = (u: unknown): u is { readonly [_: string]: unknown } =>
  typeof u === "object" && u != null && !Array.isArray(u)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<UnknownObject> = I.makeGuard(Schema, isUnknownObject)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, UnknownObject> = I.fromRefinement(
  Schema,
  isUnknownObject,
  (u) => DE.notType("{ readonly [_: string]: unknown }", u)
)

const Arbitrary: A.Arbitrary<UnknownObject> = I.makeArbitrary(
  Schema,
  (fc) => fc.dictionary(fc.string(), fc.anything())
)
