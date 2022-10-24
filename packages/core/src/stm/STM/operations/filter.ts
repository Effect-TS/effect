import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static effect/core/stm/STM.Ops filter
 * @category filtering
 * @since 1.0.0
 */
export function filter<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, Chunk.Chunk<A>> {
  return STM.suspend(
    Array.from(as).reduceRight(
      (io, a) =>
        io.zipWith(
          STM.suspend(f(a)),
          (acc, b) => (b ? pipe(acc, List.prepend(a)) : acc)
        ),
      STM.succeed(List.empty<A>()) as STM<R, E, List.List<A>>
    )
  ).map(Chunk.fromIterable)
}
