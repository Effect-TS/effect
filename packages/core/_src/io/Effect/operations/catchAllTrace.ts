/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchAllTrace
 * @tsplus pipeable effect/core/io/Effect catchAllTrace
 */
export function catchAllTrace<E, R2, E2, A2>(
  h: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E2, A | A2> => self.foldTraceEffect(h, Effect.succeed)
}
