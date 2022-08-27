/**
 * Feeds elements of type `A` to `f` and accumulates all errors, discarding
 * the successes.
 *
 * @tsplus static effect/core/io/Effect.Ops validateDiscard
 */
export function validateDiscard<R, E, A, X>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, Chunk<E>, void> {
  return Effect.partition(as, f).flatMap(({ tuple: [es, _] }) =>
    es.isEmpty
      ? Effect.unit
      : Effect.fail(es)
  )
}
