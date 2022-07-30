/**
 * Recovers from all errors.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchAll
 * @tsplus pipeable effect/core/io/Effect catchAll
 */
export function catchAll<E, R2, E2, A2>(
  f: (e: E) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R2 | R, E2, A2 | A> => self.foldEffect(f, Effect.succeed)
}
