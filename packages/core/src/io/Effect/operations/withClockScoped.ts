/**
 * Sets the implementation of the clock service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Ops withClockScoped
 */
export function withClockScoped<A extends Clock>(clock: A) {
  return DefaultServices.currentServices.locallyScopedWith(
    (env) => env.add(Clock.Tag, clock)
  )
}
