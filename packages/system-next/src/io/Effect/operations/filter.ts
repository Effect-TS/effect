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
): Effect<R, E, readonly A[]> {
  return Effect.suspendSucceed(() =>
    Iter.reduce_(as, <Effect<R, E, A[]>>Effect.succeed([]), (io, a) =>
      io.zipWith(Effect.suspendSucceed(f(a)), (as_, p) => {
        if (p) {
          as_.push(a)
        }
        return as_
      })
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
  return (as: Iterable<A>) => Effect.filter(as, f)
}
