/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import * as NumberData from "@fp-ts/schema/data/Number"
import * as StringData from "@fp-ts/schema/data/String"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/NumberFromString")

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
export const Guard = NumberData.Guard

/**
 * @since 1.0.0
 */
export const UnknownDecoder = pipe(
  StringData.UnknownDecoder,
  I.compose(I.makeDecoder(Schema, (s) => {
    const n = parseFloat(s)
    return isNaN(n) ? I.failure(DE.notType("NumberFromString", n)) : I.success(n)
  }))
)

/**
 * @since 1.0.0
 */
export const JsonEncoder = I.makeEncoder<string, number>(Schema, String)

/**
 * @since 1.0.0
 */
export const Arbitrary = NumberData.Arbitrary
