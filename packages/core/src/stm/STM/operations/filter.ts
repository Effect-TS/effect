import { Chunk } from "../../../collection/immutable/Chunk"
import * as Iter from "../../../collection/immutable/Iterable"
import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static ets/STMOps filter
 */
export function filter<A, R, E>(
  as: LazyArg<Iterable<A>>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, Chunk<A>> {
  return STM.suspend(() =>
    Iter.reduce_(as(), STM.succeed(Chunk.empty<A>()) as STM<R, E, Chunk<A>>, (io, a) =>
      io.zipWith(STM.suspend(f(a)), (acc, b) => (b ? acc.append(a) : acc))
    )
  )
}
