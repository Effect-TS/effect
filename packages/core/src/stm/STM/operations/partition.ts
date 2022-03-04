import type { List } from "../../../collection/immutable/List"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { partitionMap } from "../../../io/Effect/operations/_internal/partitionMap"
import { STM } from "../definition"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in a tupled fashion.
 *
 * @tsplus static ets/STMOps partition
 */
export function partition<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => STM<R, E, B>
): STM<R, never, Tuple<[List<E>, List<B>]>> {
  return STM.suspend(STM.forEach(as, (a) => f(a).either())).map((chunk) =>
    partitionMap(chunk, identity)
  )
}
