/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import { arbitraryAnnotation } from "@fp-ts/schema/annotation/ArbitraryAnnotation"
import { decoderAnnotation } from "@fp-ts/schema/annotation/DecoderAnnotation"
import { encoderAnnotation } from "@fp-ts/schema/annotation/EncoderAnnotation"
import { guardAnnotation } from "@fp-ts/schema/annotation/GuardAnnotation"
import { prettyAnnotation } from "@fp-ts/schema/annotation/PrettyAnnotation"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const parse = <A, B>(
  decode: Decoder<A, B>["decode"],
  encode: Encoder<A, B>["encode"],
  is: (u: unknown) => u is B,
  arbitrary: Arbitrary<B>["arbitrary"],
  pretty: Pretty<B>["pretty"],
  annotations: ReadonlyArray<unknown>
): (self: Schema<A>) => Schema<B> => {
  const guard = (self: Guard<A>): Guard<B> => I.makeGuard(schema(self), is)

  const decoder = (self: Decoder<unknown, A>): Decoder<unknown, B> =>
    I.makeDecoder(schema(self), (i) => pipe(self.decode(i), I.flatMap(decode)))

  const encoder = (self: Encoder<unknown, A>): Encoder<unknown, B> =>
    I.makeEncoder(schema(self), (b) => self.encode(encode(b)))

  const _arbitrary = (self: Arbitrary<A>): Arbitrary<B> => I.makeArbitrary(schema(self), arbitrary)

  const _pretty = (self: Pretty<A>): Pretty<B> => I.makePretty(schema(self), pretty)

  const schema = (self: Schema<A>): Schema<B> =>
    I.typeAlias([self], self, [
      ...annotations,
      decoderAnnotation(decoder),
      guardAnnotation(guard),
      encoderAnnotation(encoder),
      prettyAnnotation(_pretty),
      arbitraryAnnotation(_arbitrary)
    ])

  return schema
}
