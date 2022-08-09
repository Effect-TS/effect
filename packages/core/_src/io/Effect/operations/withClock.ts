/**
 * Executes the specified workflow with the specified implementation of the
 * clock service.
 *
 * @tsplus static effect/core/io/Effect.Ops withClock
 */
export function withClock<C extends Clock>(clock: C) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
    DefaultServices.currentServices.locallyWith(
      (env) => env.add(Clock.Tag, clock)
    )(effect)
}
