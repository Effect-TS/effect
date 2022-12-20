/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"
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
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const filterWith = <Config, B>(
  id: unknown,
  decode: (config: Config) => Decoder<B, B>["decode"]
) => {
  const predicate = (config: Config) => (b: B): boolean => !I.isFailure(decode(config)(b))

  const guard = (config: Config, self: Guard<B>): Guard<B> =>
    I.makeGuard(schema(config)(self), (u): u is B => self.is(u) && predicate(config)(u))

  const decoder = (config: Config, self: Decoder<unknown, B>): Decoder<unknown, B> =>
    I.makeDecoder(schema(config)(self), (i) => pipe(self.decode(i), I.flatMap(decode(config))))

  const encoder = (config: Config, self: Encoder<unknown, B>): Encoder<unknown, B> =>
    I.makeEncoder(schema(config)(self), self.encode)

  const arbitrary = (config: Config, self: Arbitrary<B>): Arbitrary<B> =>
    I.makeArbitrary(schema(config)(self), (fc) => self.arbitrary(fc).filter(predicate(config)))

  const pretty = (config: Config, self: Pretty<B>): Pretty<B> =>
    I.makePretty(schema(config)(self), (b) => self.pretty(b))

  const Provider = P.make(id, {})

  const schema = (config: Config) =>
    <A extends B>(self: Schema<A>): Schema<A> =>
      I.typeAlias(id, O.some(config), Provider, [self], self, [
        decoderAnnotation(config, (config, self) => decoder(config, self)),
        guardAnnotation(config, (config, self) => guard(config, self)),
        encoderAnnotation(config, (config, self) => encoder(config, self)),
        prettyAnnotation(config, (config, self) => pretty(config, self)),
        arbitraryAnnotation(config, (config, self) => arbitrary(config, self))
      ])

  return schema
}
