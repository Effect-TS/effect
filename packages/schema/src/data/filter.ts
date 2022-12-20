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
export const filter = <B>(
  decode: Decoder<B, B>["decode"]
): <A extends B>(self: Schema<A>) => Schema<A> => {
  const predicate = (b: B): boolean => !I.isFailure(decode(b))

  const guard = (self: Guard<B>): Guard<B> =>
    I.makeGuard(self, (u): u is B => self.is(u) && predicate(u))

  const decoder = (self: Decoder<unknown, B>): Decoder<unknown, B> =>
    I.makeDecoder(self, (i) => pipe(self.decode(i), I.flatMap(decode)))

  const encoder = (self: Encoder<unknown, B>): Encoder<unknown, B> =>
    I.makeEncoder(self, self.encode)

  const arbitrary = (self: Arbitrary<B>): Arbitrary<B> =>
    I.makeArbitrary(self, (fc) => self.arbitrary(fc).filter(predicate))

  const pretty = (self: Pretty<B>): Pretty<B> => I.makePretty(self, (b) => self.pretty(b))

  const schema = <A extends B>(self: Schema<A>): Schema<A> =>
    I.typeAlias([self], self, [
      decoderAnnotation(decoder),
      guardAnnotation(guard),
      encoderAnnotation(encoder),
      prettyAnnotation(pretty),
      arbitraryAnnotation(arbitrary)
    ])

  return schema
}
