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
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const filterWith = <Config, B>(
  id: symbol,
  decode: (config: Config) => Decoder<B, B>["decode"]
) => {
  const _predicate = (config: Config) => (b: B): boolean => !I.isFailure(decode(config)(b))

  const _guard = (config: Config) =>
    (self: Guard<B>): Guard<B> =>
      I.makeGuard(schema(config)(self), (u): u is B => self.is(u) && _predicate(config)(u))

  const _unknownDecoder = (config: Config) =>
    <I>(self: Decoder<I, B>): Decoder<I, B> =>
      I.makeDecoder(schema(config)(self), (i) => pipe(self.decode(i), I.flatMap(decode(config))))

  const _jsonEncoder = (config: Config) =>
    (self: JsonEncoder<B>): JsonEncoder<B> => I.makeEncoder(schema(config)(self), self.encode)

  const _arbitrary = (config: Config) =>
    (self: Arbitrary<B>): Arbitrary<B> =>
      I.makeArbitrary(schema(config)(self), (fc) => self.arbitrary(fc).filter(_predicate(config)))

  const _pretty = (config: Config) =>
    (self: Pretty<B>): Pretty<B> => I.makePretty(schema(config)(self), (b) => self.pretty(b))

  const Provider = P.make(id, {
    [I.GuardId]: _guard,
    [I.ArbitraryId]: _arbitrary,
    [I.UnknownDecoderId]: _unknownDecoder,
    [I.JsonDecoderId]: _unknownDecoder,
    [I.UnknownEncoderId]: _jsonEncoder,
    [I.JsonEncoderId]: _jsonEncoder,
    [I.PrettyId]: _pretty
  })

  const schema = (config: Config) =>
    <A extends B>(self: Schema<A>): Schema<A> => I.declareSchema(id, O.some(config), Provider, self)

  return schema
}
