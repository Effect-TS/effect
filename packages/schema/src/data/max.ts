/**
 * @since 1.0.0
 */

import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
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
export const id = Symbol.for("@fp-ts/schema/data/max")

const guard = (max: number) =>
  <A extends number>(self: Guard<A>): Guard<A> =>
    I.makeGuard(schema(max)(self), (u): u is A => self.is(u) && u <= max)

const unknownDecoder = (max: number) =>
  <I, A extends number>(self: Decoder<I, A>): Decoder<I, A> =>
    I.makeDecoder(
      schema(max)(self),
      (i) => pipe(self.decode(i), I.flatMap((a) => a <= max ? I.succeed(a) : I.fail(DE.max(max))))
    )

const jsonEncoder = (max: number) =>
  <A extends number>(self: JsonEncoder<A>): JsonEncoder<A> =>
    I.makeEncoder(schema(max)(self), self.encode)

const arbitrary = (max: number) =>
  <A extends number>(self: Arbitrary<A>): Arbitrary<A> =>
    I.makeArbitrary(schema(max)(self), (fc) => self.arbitrary(fc).filter((a) => a <= max))

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

/**
 * @since 1.0.0
 */
export const schema = (max: number) =>
  <A extends number>(self: Schema<A>): Schema<A> => I.declareSchema(id, O.some(max), Provider, self)
