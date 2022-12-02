/**
 * @since 1.0.0
 */
import * as Boolean from "@fp-ts/data/Boolean"
import * as Number from "@fp-ts/data/Number"
import * as O from "@fp-ts/data/Option"
import * as StringData from "@fp-ts/data/String"
import * as DE from "@fp-ts/schema/DecodeError"
import * as I from "@fp-ts/schema/internal/common"
import * as P from "@fp-ts/schema/Provider"
import type * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/bigint")

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
export const Schema: S.Schema<bigint> = I.declareSchema(id, O.none, Provider)

const isBigint = (u: unknown): u is bigint => typeof u === "bigint"

/**
 * @since 1.0.0
 */
export const Guard = I.makeGuard<bigint>(Schema, isBigint)

/**
 * @since 1.0.0
 */
export const UnknownDecoder = I.makeDecoder<unknown, bigint>(
  Schema,
  (u) => {
    if (isBigint(u)) {
      return I.success(u)
    }
    if (StringData.isString(u) || Number.isNumber(u) || Boolean.isBoolean(u)) {
      try {
        return I.success(BigInt(u))
      } catch (e) {
        return I.failure(DE.notType(String(e), u))
      }
    }
    return I.failure(DE.notType("string | number | bigint | boolean", u))
  }
)

/**
 * @since 1.0.0
 */
export const JsonEncoder = I.makeEncoder<string, bigint>(Schema, (n) => n.toString())

/**
 * @since 1.0.0
 */
export const Arbitrary = I.makeArbitrary<bigint>(Schema, (fc) => fc.bigInt())
