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
export const id = Symbol.for("@fp-ts/codec/data/min")

/**
 * @since 1.0.0
 */
export const guard = (min: number) =>
  <A extends number>(self: Guard<A>): Guard<A> =>
    I.makeGuard(schema(min)(self), (u): u is A => self.is(u) && u >= min)

/**
 * @since 1.0.0
 */
export const decoder = (min: number) =>
  <I, A extends number>(self: Decoder<I, A>): Decoder<I, A> =>
    I.makeDecoder(
      schema(min)(self),
      (i) => pipe(self.decode(i), I.flatMap((a) => a >= min ? I.succeed(a) : I.fail(DE.min(min))))
    )

/**
 * @since 1.0.0
 */
export const arbitrary = (min: number) =>
  <A extends number>(self: Arbitrary<A>): Arbitrary<A> =>
    I.makeArbitrary(schema(min)(self), (fc) => self.arbitrary(fc).filter((a) => a >= min))

/**
 * @since 1.0.0
 */
export const show = (min: number) =>
  <A extends number>(self: Show<A>): Show<A> => I.makeShow(schema(min)(self), (a) => self.show(a))

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
export const schema = (min: number) =>
  <A extends number>(self: Schema<A>): Schema<A> => I.declareSchema(id, O.some(min), Provider, self)
