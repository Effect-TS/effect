import type { Duration } from "@fp-ts/data/Duration"

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @tsplus static effect/core/io/Effect.Aspects cached
 * @tsplus pipeable effect/core/io/Effect cached
 * @category mutations
 * @since 1.0.0
 */
export function cached(timeToLive: Duration) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, never, Effect<never, E, A>> =>
    self.cachedInvalidate(timeToLive).map((tuple) => tuple[0])
}
