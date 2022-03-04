import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Folds an `Iterable<A>` using an effectual function f, working sequentially
 * from left to right.
 *
 * @tsplus static ets/STMOps reduce
 */
export function reduce<A, Z, R, E>(
  as: LazyArg<Iterable<A>>,
  z: LazyArg<Z>,
  f: (z: Z, a: A) => STM<R, E, Z>
): STM<R, E, Z> {
  return STM.suspend(
    Iter.reduce_(as(), STM.succeed(z) as STM<R, E, Z>, (acc, el) =>
      acc.flatMap((a) => f(a, el))
    )
  )
}
