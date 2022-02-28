import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Sync } from "../definition"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * If you do not need the results, see `forEachDiscard` for a more efficient
 * implementation.
 *
 * @tsplus static ets/SyncOps forEach
 */
export function forEach<A, R, E, B>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => Sync<R, E, B>
): Sync<R, E, Chunk<B>> {
  return Sync.suspend(() => {
    const acc: B[] = []
    return Sync.forEachDiscard(as, (a) =>
      f(a).map((b) => {
        acc.push(b)
      })
    ).map(() => Chunk.from(acc))
  })
}
