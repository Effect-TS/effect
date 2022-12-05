/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { JsonEncoder } from "@fp-ts/schema/JsonEncoder"
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const parse = <A, B>(
  id: symbol,
  decode: Decoder<A, B>["decode"],
  encode: Encoder<A, B>["encode"],
  is: (u: unknown) => u is B,
  arbitrary: Arbitrary<B>["arbitrary"],
  pretty: Pretty<B>["pretty"]
) => {
  const _guard = (self: Guard<A>): Guard<B> => I.makeGuard(schema(self), is)

  const _unknownDecoder = <I>(self: Decoder<I, A>): Decoder<I, B> =>
    I.makeDecoder(schema(self), (i) => pipe(self.decode(i), I.flatMap(decode)))

  const _jsonEncoder = (self: JsonEncoder<A>): JsonEncoder<B> =>
    I.makeEncoder(schema(self), (b) => self.encode(encode(b)))

  const _arbitrary = (self: Arbitrary<A>): Arbitrary<B> => I.makeArbitrary(schema(self), arbitrary)

  const _pretty = (self: Pretty<A>): Pretty<B> => I.makePretty(schema(self), pretty)

  const Provider = P.make(id, {
    [I.GuardId]: _guard,
    [I.ArbitraryId]: _arbitrary,
    [I.UnknownDecoderId]: _unknownDecoder,
    [I.JsonDecoderId]: _unknownDecoder,
    [I.UnknownEncoderId]: _jsonEncoder,
    [I.JsonEncoderId]: _jsonEncoder,
    [I.PrettyId]: _pretty
  })

  const schema = (self: Schema<A>): Schema<B> => I.declareSchema(id, O.none, Provider, self)

  return schema
}
