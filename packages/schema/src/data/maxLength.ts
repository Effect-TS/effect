/**
 * @since 1.0.0
 */

import type { Arbitrary } from "@fp-ts/codec/Arbitrary"
import * as DE from "@fp-ts/codec/DecodeError"
import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Guard } from "@fp-ts/codec/Guard"
import * as I from "@fp-ts/codec/internal/common"
import * as P from "@fp-ts/codec/Provider"
import type { Schema } from "@fp-ts/codec/Schema"
import type { Show } from "@fp-ts/codec/Show"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export const id = Symbol.for("@fp-ts/codec/data/maxLength")

/**
 * @since 1.0.0
 */
export const guard = (maxLength: number) =>
  <A extends { length: number }>(self: Guard<A>): Guard<A> =>
    I.makeGuard(schema(maxLength)(self), (u): u is A => self.is(u) && u.length <= maxLength)

/**
 * @since 1.0.0
 */
export const decoder = (maxLength: number) =>
  <I, A extends { length: number }>(self: Decoder<I, A>): Decoder<I, A> =>
    I.makeDecoder(
      schema(maxLength)(self),
      (i) =>
        pipe(
          self.decode(i),
          I.flatMap((a) => a.length <= maxLength ? I.succeed(a) : I.fail(DE.maxLength(maxLength)))
        )
    )

/**
 * @since 1.0.0
 */
export const arbitrary = (maxLength: number) =>
  <A extends { length: number }>(self: Arbitrary<A>): Arbitrary<A> =>
    I.makeArbitrary(
      schema(maxLength)(self),
      (fc) => self.arbitrary(fc).filter((a) => a.length <= maxLength)
    )

/**
 * @since 1.0.0
 */
export const show = (maxLength: number) =>
  <A extends { length: number }>(self: Show<A>): Show<A> =>
    I.makeShow(schema(maxLength)(self), (a) => self.show(a))

/**
 * @since 1.0.0
 */
export const Provider: P.Provider = P.make(id, {
  [I.ArbitraryId]: arbitrary,
  [I.DecoderId]: decoder,
  [I.GuardId]: guard,
  [I.JsonDecoderId]: decoder,
  [I.ShowId]: show
})

/**
 * @since 1.0.0
 */
export const schema = (maxLength: number) =>
  <A extends { length: number }>(self: Schema<A>): Schema<A> =>
    I.declareSchema(id, O.some(maxLength), Provider, self)
