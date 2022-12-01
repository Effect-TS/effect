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
export const id = Symbol.for("@fp-ts/schema/data/UnknownArray")

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
export type UnknownArray = ReadonlyArray<unknown>

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<UnknownArray> = I.declareSchema(id, O.none, Provider)

const isUnknownArray = (u: unknown): u is UnknownArray => Array.isArray(u)

/**
 * @since 1.0.0
 */
export const Guard: G.Guard<UnknownArray> = I.makeGuard(Schema, isUnknownArray)

/**
 * @since 1.0.0
 */
export const Decoder: D.Decoder<unknown, UnknownArray> = I.fromRefinement(
  Schema,
  isUnknownArray,
  (u) => DE.notType("ReadonlyArray<unknown>", u)
)

const Arbitrary: A.Arbitrary<UnknownArray> = I.makeArbitrary(
  Schema,
  (fc) => fc.array(fc.anything())
)
