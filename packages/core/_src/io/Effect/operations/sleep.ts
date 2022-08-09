/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops sleep
 */
export function sleep(duration: Duration): Effect<never, never, void> {
  return Clock.sleep(duration)
}
