import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import { Effect } from "../definition"

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static ets/EffectOps filter
 */
export function filter_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() =>
    Iter.reduce_(
      as,
      Effect.succeed(Chunk.empty<A>()) as Effect<R, E, Chunk<A>>,
      (io, a) =>
        io.zipWith(Effect.suspendSucceed(f(a)), (acc, b) => (b ? acc.append(a) : acc))
    )
  )
}

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @ets_data_first filter_
 */
export function filter<A, R, E>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (as: Iterable<A>): Effect<R, E, Chunk<A>> => Effect.filter(as, f)
}
