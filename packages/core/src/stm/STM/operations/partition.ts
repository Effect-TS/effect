import { partitionMap } from "@effect/core/io/Effect/operations/_internal/partitionMap"
import { identity } from "@fp-ts/data/Function"
import type { List } from "@fp-ts/data/List"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @tsplus static effect/core/stm/STM.Ops partition
 * @category constructors
 * @since 1.0.0
 */
export function partition<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, B>
): STM<R, never, readonly [List<E>, List<B>]> {
  return STM.suspend(STM.forEach(as, (a) => f(a).either)).map((chunk) =>
    partitionMap(chunk, identity)
  )
}
