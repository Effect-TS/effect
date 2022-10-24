import * as Chunk from "@fp-ts/data/Chunk"
import * as List from "@fp-ts/data/List"

/**
 * Feeds elements of type `A` to `f` in parallel and accumulates all errors,
 * discarding the successes.
 *
 * @tsplus static effect/core/io/Effect.Ops validateParDiscard
 * @category validation
 * @since 1.0.0
 */
export function validateParDiscard<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, Chunk.Chunk<E>, void> {
  return Effect.partitionPar(as, f).flatMap(([es, _]) =>
    List.isNil(es)
      ? Effect.unit
      : Effect.fail(Chunk.fromIterable(es))
  )
}
