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
import type { Pretty } from "@fp-ts/schema/Pretty"
import * as P from "@fp-ts/schema/Provider"
import type { Schema } from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const refine = <B, C extends B>(
  id: unknown,
  decode: Decoder<B, C>["decode"]
) => {
  const _isC = (b: B): b is C => !I.isFailure(decode(b))

  const _guard = (self: Guard<B>): Guard<C> =>
    I.makeGuard(schema(self), (u): u is C => self.is(u) && _isC(u))

  const _decoder = (self: Decoder<unknown, B>): Decoder<unknown, C> =>
    I.makeDecoder(schema(self), (i) => pipe(self.decode(i), I.flatMap(decode)))

  const _encoder = (self: Encoder<unknown, B>): Encoder<unknown, C> =>
    I.makeEncoder(schema(self), self.encode)

  const _arbitrary = (self: Arbitrary<B>): Arbitrary<C> =>
    I.makeArbitrary(schema(self), (fc) => self.arbitrary(fc).filter(_isC))

  const _pretty = (self: Pretty<B>): Pretty<C> => I.makePretty(schema(self), (b) => self.pretty(b))

  const Provider = P.make(id, {
    [I.GuardId]: _guard,
    [I.ArbitraryId]: _arbitrary,
    [I.DecoderId]: _decoder,
    [I.EncoderId]: _encoder,
    [I.PrettyId]: _pretty
  })

  const schema = <A extends B>(self: Schema<A>): Schema<A & C> =>
    I.typeAlias(id, O.none, Provider, [self], self)

  return schema
}
