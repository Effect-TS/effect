/**
 * Returns an effect that executes both this effect and the specified effect,
 * in parallel. Combines both Cause<E1>` when both effects fail.
 *
 * @tsplus static effect/core/io/Effect.Aspects validatePar
 * @tsplus pipeable effect/core/io/Effect validatePar
 */
export function validateParNow<R1, E1, B>(that: Effect<R1, E1, B>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R1, E | E1, readonly [A, B]> =>
    self.validateWithPar(that, (a, b) => [a, b] as const)
}

/**
 * Feeds elements of type `A` to `f `and accumulates, in parallel, all errors
 * in error channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use [[partitionPar]].
 *
 * @tsplus static effect/core/io/Effect.Ops validatePar
 */
export function validatePar<R, E, A, B>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, B>
): Effect<R, Chunk<E>, Chunk<B>> {
  return Effect.partitionPar(as, f).flatMap(([es, bs]) =>
    es.isEmpty
      ? Effect.succeed(Chunk.from(bs))
      : Effect.fail(es)
  )
}
