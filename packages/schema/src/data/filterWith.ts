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
export const filterWith = <Config, B>(
  id: symbol,
  decode: (config: Config) => Decoder<B, B>["decode"]
) => {
  const predicate = (config: Config) => (b: B): boolean => !I.isFailure(decode(config)(b))

  const guard = (config: Config) =>
    (self: Guard<B>): Guard<B> =>
      I.makeGuard(schema(config)(self), (u): u is B => self.is(u) && predicate(config)(u))

  const unknownDecoder = (config: Config) =>
    <I>(self: Decoder<I, B>): Decoder<I, B> =>
      I.makeDecoder(schema(config)(self), (i) => pipe(self.decode(i), I.flatMap(decode(config))))

  const jsonEncoder = (config: Config) =>
    (self: JsonEncoder<B>): JsonEncoder<B> => I.makeEncoder(schema(config)(self), self.encode)

  const arbitrary = (config: Config) =>
    (self: Arbitrary<B>): Arbitrary<B> =>
      I.makeArbitrary(schema(config)(self), (fc) => self.arbitrary(fc).filter(predicate(config)))

  const Provider = P.make(id, {
    [I.GuardId]: guard,
    [I.ArbitraryId]: arbitrary,
    [I.UnknownDecoderId]: unknownDecoder,
    [I.JsonDecoderId]: unknownDecoder,
    [I.UnknownEncoderId]: jsonEncoder,
    [I.JsonEncoderId]: jsonEncoder
  })

  const schema = (config: Config) =>
    <A extends B>(self: Schema<A>): Schema<A> => I.declareSchema(id, O.some(config), Provider, self)

  return schema
}
