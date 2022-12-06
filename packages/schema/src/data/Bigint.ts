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
  [I.DecoderId]: () => Decoder,
  [I.EncoderId]: () => Encoder,
  [I.PrettyId]: () => Pretty
})

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<bigint> = I.declareSchema(id, O.none, Provider)

const isBigint = (u: unknown): u is bigint => typeof u === "bigint"

const Guard = I.makeGuard<bigint>(Schema, isBigint)

const Decoder = I.makeDecoder<unknown, bigint>(
  Schema,
  (u) => {
    if (isBigint(u)) {
      return I.success(u)
    }
    if (StringData.isString(u) || Number.isNumber(u) || Boolean.isBoolean(u)) {
      try {
        return I.success(BigInt(u))
      } catch (e) {
        const expected = e instanceof Error ? e.message : String(e)
        return I.failure(DE.custom(expected, u))
      }
    }
    return I.failure(DE.notType("string | number | bigint | boolean", u))
  }
)

const Encoder = I.makeEncoder<unknown, bigint>(Schema, (n) => n.toString())

const Arbitrary = I.makeArbitrary<bigint>(Schema, (fc) => fc.bigInt())

const Pretty = I.makePretty<bigint>(Schema, (n) => n.toString())
