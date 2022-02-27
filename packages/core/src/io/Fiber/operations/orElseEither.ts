import { Either } from "../../../data/Either"
import type { LazyArg } from "../../../data/Function"
import type { Fiber } from "../definition"

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @tsplus fluent ets/Fiber orElseEither
 * @tsplus fluent ets/RuntimeFiber orElseEither
 */
export function orElseEither_<E, E1, A, B>(
  self: Fiber<E, A>,
  that: LazyArg<Fiber<E1, B>>
): Fiber<E | E1, Either<A, B>> {
  return self.map(Either.left) | that().map(Either.right)
}

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the `that` one
 * when `this` one fails. Interrupting the returned fiber will interrupt both
 * fibers, sequentially, from left to right.
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<E1, B>(that: LazyArg<Fiber<E1, B>>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E | E1, Either<A, B>> =>
    self.orElseEither(that)
}
