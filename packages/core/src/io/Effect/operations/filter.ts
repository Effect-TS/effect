import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static ets/EffectOps filter
 */
export function filter<A, R, E>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() =>
    Iter.reduce_(
      as(),
      Effect.succeed(Chunk.empty<A>()) as Effect<R, E, Chunk<A>>,
      (io, a) =>
        io.zipWith(Effect.suspendSucceed(f(a)), (acc, b) => (b ? acc.append(a) : acc))
    )
  )
}
