import * as Context from "@fp-ts/data/Context"

/**
 * Sets the implementation of the clock service to the specified value and
 * restores it to its original value when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Ops withClockScoped
 * @category constructors
 * @since 1.0.0
 */
export function withClockScoped<A extends Clock>(clock: A) {
  return DefaultServices.currentServices.locallyScopedWith(
    Context.add(Clock.Tag)(clock)
  )
}
