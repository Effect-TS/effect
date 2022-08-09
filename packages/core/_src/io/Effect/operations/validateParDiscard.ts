/**
 * Feeds elements of type `A` to `f` in parallel and accumulates all errors,
 * discarding the successes.
 *
 * @tsplus static effect/core/io/Effect.Ops validateParDiscard
 */
export function validateParDiscard<R, E, A, X>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, X>
): Effect<R, Chunk<E>, void> {
  return Effect.partitionPar(as, f).flatMap(({ tuple: [es, _] }) =>
    es.isEmpty
      ? Effect.unit
      : Effect.failSync(es)
  )
}
