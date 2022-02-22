import type { List } from "../../../collection/immutable/List"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Effect } from "../definition"
import { partitionMap } from "./_internal/partitionMap"

/**
 * Feeds elements of type `A` to a function `f` that returns an effect.
 * Collects all successes and failures in parallel and returns the result as a
 * tuple.
 *
 * @tsplus static ets/EffectOps partitionPar
 */
export function partitionPar<R, E, A, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, B>,
  __etsTrace?: string
): Effect<R, never, Tuple<[List<E>, List<B>]>> {
  return Effect.suspendSucceed(Effect.forEachPar(as, (a) => f(a).either())).map(
    (chunk) => partitionMap(chunk, identity)
  )
}
