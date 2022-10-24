import type { Duration } from "@fp-ts/data/Duration"

/**
 * @tsplus static effect/core/io/Clock.Ops sleep
 * @category constructors
 * @since 1.0.0
 */
export function sleep(duration: Duration): Effect<never, never, void> {
  return Effect.clockWith((clock) => clock.sleep(duration))
}
