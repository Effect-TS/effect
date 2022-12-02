/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
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
  [I.UnknownDecoderId]: () => UnknownDecoder,
  [I.JsonDecoderId]: () => UnknownDecoder,
  [I.UnknownEncoderId]: () => UnknownEncoder
})

/**
 * @since 1.0.0
 */
export interface UnknownArray extends ReadonlyArray<unknown> {}

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<UnknownArray> = I.declareSchema(id, O.none, Provider)

const isUnknownArray = (u: unknown): u is UnknownArray => Array.isArray(u)

/**
 * @since 1.0.0
 */
export const Guard = I.makeGuard<UnknownArray>(Schema, isUnknownArray)

/**
 * @since 1.0.0
 */
export const UnknownDecoder = I.fromRefinement<UnknownArray>(
  Schema,
  isUnknownArray,
  (u) => DE.notType("ReadonlyArray<unknown>", u)
)

/**
 * @since 1.0.0
 */
export const UnknownEncoder = I.makeEncoder<UnknownArray, UnknownArray>(Schema, identity)

/**
 * @since 1.0.0
 */
export const Arbitrary = I.makeArbitrary<UnknownArray>(Schema, (fc) => fc.array(fc.anything()))
