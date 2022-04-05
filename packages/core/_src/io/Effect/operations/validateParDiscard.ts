/**
 * Feeds elements of type `A` to `f` in parallel and accumulates all errors,
 * discarding the successes.
 *
 * @tsplus static ets/Effect/Ops validateParDiscard
 */
export function validateParDiscard<R, E, A, X>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, X>,
  __tsplusTrace?: string
): Effect<R, Chunk<E>, void> {
  return Effect.partitionPar(as, f).flatMap(({ tuple: [es, _] }) =>
    es.isEmpty()
      ? Effect.unit
      : Effect.fail(es)
  );
}
