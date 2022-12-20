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
import * as AST from "@fp-ts/schema/AST"
import type { Decoder } from "@fp-ts/schema/Decoder"
import type { Encoder } from "@fp-ts/schema/Encoder"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const refine = <B, C extends B>(
  decode: Decoder<B, C>["decode"]
) => {
  const isC = (b: B): b is C => !I.isFailure(decode(b))

  const guard = (self: Guard<B>): Guard<C> =>
    I.makeGuard(schema(self), (u): u is C => self.is(u) && isC(u))

  const decoder = (self: Decoder<unknown, B>): Decoder<unknown, C> =>
    I.makeDecoder(schema(self), (i) => pipe(self.decode(i), I.flatMap(decode)))

  const encoder = (self: Encoder<unknown, B>): Encoder<unknown, C> =>
    I.makeEncoder(schema(self), self.encode)

  const arbitrary = (self: Arbitrary<B>): Arbitrary<C> =>
    I.makeArbitrary(schema(self), (fc) => self.arbitrary(fc).filter(isC))

  const pretty = (self: Pretty<B>): Pretty<C> => I.makePretty(schema(self), (b) => self.pretty(b))

  const schema = <A extends B>(self: Schema<A>): Schema<A & C> =>
    I.makeSchema(AST.prependAllAnnotations(self.ast, [
      decoderAnnotation(null, (_, self) => decoder(self)),
      guardAnnotation(null, (_, self) => guard(self)),
      encoderAnnotation(null, (_, self) => encoder(self)),
      prettyAnnotation(null, (_, self) => pretty(self)),
      arbitraryAnnotation(null, (_, self) => arbitrary(self))
    ]))

  return schema
}
