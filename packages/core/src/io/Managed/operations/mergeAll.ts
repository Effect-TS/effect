import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Merges an `Iterable<Managed<R, E, A>` to a single `Managed<R, E, B>`,
 * working sequentially.
 *
 * @tsplus static ets/ManagedOps mergeAll
 */
export function mergeAll<R, E, A, B>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  zero: LazyArg<B>,
  f: (b: B, a: A) => B,
  __tsplusTrace?: string
): Managed<R, E, B> {
  return Managed.suspend(
    Iter.reduce_(as(), Managed.succeed(zero) as Managed<R, E, B>, (b, a) =>
      b.zipWith(a, f)
    )
  )
}
