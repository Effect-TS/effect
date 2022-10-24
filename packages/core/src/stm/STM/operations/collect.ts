import * as Chunk from "@fp-ts/data/Chunk"
import type * as Option from "@fp-ts/data/Option"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static effect/core/stm/STM.Ops collect
 * @category constructors
 * @since 1.0.0
 */
export function collect<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => STM<R, Option.Option<E>, B>
): STM<R, E, Chunk.Chunk<B>> {
  return STM.forEach(as, (a) => f(a).unsome).map(Chunk.compact)
}

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects collect
 * @tsplus pipeable effect/core/stm/STM collect
 * @category constructors
 * @since 1.0.0
 */
export function collectNow<A, B>(pf: (a: A) => Option.Option<B>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> =>
    self.collectSTM(
      (_) => STM.succeed(pf(_))
    )
}
