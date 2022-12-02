/**
 * @since 1.0.0
 */
import { identity } from "@fp-ts/data/Function"
import * as Number from "@fp-ts/data/Number"
import * as O from "@fp-ts/data/Option"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/number")

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: () => Guard,
  [I.ArbitraryId]: () => Arbitrary,
  [I.UnknownDecoderId]: () => UnknownDecoder,
  [I.JsonDecoderId]: () => UnknownDecoder,
  [I.UnknownEncoderId]: () => JsonEncoder,
  [I.JsonEncoderId]: () => JsonEncoder
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<number> = I.declareSchema(id, O.none, Provider)

/**
 * @since 1.0.0
 */
export const Guard = I.makeGuard<number>(Schema, Number.isNumber)

/**
 * @since 1.0.0
 */
export const UnknownDecoder = I.makeDecoder<unknown, number>(
  Schema,
  (u) =>
    Guard.is(u) ?
      isNaN(u) ?
        I.warning(DE.nan, u) :
        isFinite(u) ?
        I.success(u) :
        I.warning(DE.noFinite, u) :
      I.failure(DE.notType("number", u))
)

/**
 * @since 1.0.0
 */
export const JsonEncoder = I.makeEncoder<number, number>(Schema, identity)

const Arbitrary = I.makeArbitrary<number>(Schema, (fc) => fc.float())
