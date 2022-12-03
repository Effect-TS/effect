/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import * as NumberData from "@fp-ts/schema/data/Number"
import * as DE from "@fp-ts/schema/DecodeError"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { JsonEncoder } from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/schema/data/parseFloat")

/** @internal */
export const guard = (self: Guard<string>): Guard<number> =>
  I.makeGuard(schema(self), NumberData.Guard.is)

/**
 * @since 1.0.0
 */
export const unknownDecoder = <I>(self: Decoder<I, string>): Decoder<I, number> =>
  I.makeDecoder(
    schema(self),
    (i) =>
      pipe(
        self.decode(i),
        I.flatMap((s) => {
          const n = parseFloat(s)
          return isNaN(n) ?
            I.failure(DE.custom("cannot be converted to a number by parseFloat", s)) :
            I.success(n)
        })
      )
  )

/**
 * @since 1.0.0
 */
export const jsonEncoder = (self: JsonEncoder<string>): JsonEncoder<number> =>
  I.makeEncoder(schema(self), (n) => self.encode(String(n)))

const arbitrary = (self: Arbitrary<string>): Arbitrary<number> =>
  I.makeArbitrary(
    schema(self),
    (fc) => NumberData.Arbitrary.arbitrary(fc).filter((n) => !isNaN(n) && isFinite(n))
  )

/**
 * @since 1.0.0
 */
export const schema = (self: Schema<string>): Schema<number> =>
  I.declareSchema(id, O.none, Provider, self)

/**
 * @since 1.0.0
 */
export const Provider = P.make(id, {
  [I.GuardId]: guard,
  [I.ArbitraryId]: arbitrary,
  [I.UnknownDecoderId]: unknownDecoder,
  [I.JsonDecoderId]: unknownDecoder,
  [I.UnknownEncoderId]: jsonEncoder,
  [I.JsonEncoderId]: jsonEncoder
})
