import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

/**
 * Filters the collection using the specified effectual predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops filter
 * @category filtering
 * @since 1.0.0
 */
export function filter<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return Effect.suspendSucceed(
    pipe(
      ReadonlyArray.fromIterable(as),
      ReadonlyArray.reduceRight(
        Effect.sync(List.empty<A>()) as Effect<R, E, List.List<A>>,
        (effect, a) =>
          effect.zipWith(
            Effect.suspendSucceed(f(a)),
            (list, b) => b ? pipe(list, List.prepend(a)) : list
          )
      )
    ).map(Chunk.fromIterable)
  )
}
