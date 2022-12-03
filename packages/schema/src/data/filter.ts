/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { JsonEncoder } from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const filter = <B>(
  id: symbol,
  decode: Decoder<B, B>["decode"]
) => {
  const predicate = (b: B): boolean => !I.isFailure(decode(b))

  const guard = (self: Guard<B>): Guard<B> =>
    I.makeGuard(schema(self), (u): u is B => self.is(u) && predicate(u))

  const unknownDecoder = <I>(self: Decoder<I, B>): Decoder<I, B> =>
    I.makeDecoder(schema(self), (i) => pipe(self.decode(i), I.flatMap(decode)))

  const jsonEncoder = (self: JsonEncoder<B>): JsonEncoder<B> =>
    I.makeEncoder(schema(self), self.encode)

  const arbitrary = (self: Arbitrary<B>): Arbitrary<B> =>
    I.makeArbitrary(schema(self), (fc) => self.arbitrary(fc).filter(predicate))

  const Provider = P.make(id, {
    [I.GuardId]: guard,
    [I.ArbitraryId]: arbitrary,
    [I.UnknownDecoderId]: unknownDecoder,
    [I.JsonDecoderId]: unknownDecoder,
    [I.UnknownEncoderId]: jsonEncoder,
    [I.JsonEncoderId]: jsonEncoder
  })

  const schema = <A extends B>(self: Schema<A>): Schema<A> =>
    I.declareSchema(id, O.none, Provider, self)

  return schema
}
