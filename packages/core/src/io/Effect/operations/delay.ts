import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns an effect that is delayed from this effect by the specified
 * `Duration`.
 *
 * @tsplus static effect/core/io/Effect.Aspects delay
 * @tsplus pipeable effect/core/io/Effect delay
 * @category mutations
 * @since 1.0.0
 */
export function delay(duration: Duration) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => Clock.sleep(duration).zipRight(self)
}
