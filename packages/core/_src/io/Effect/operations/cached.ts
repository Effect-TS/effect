/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @tsplus static effect/core/io/Effect.Aspects cached
 * @tsplus pipeable effect/core/io/Effect cached
 */
export function cached(timeToLive: LazyArg<Duration>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, never, Effect<never, E, A>> =>
    self.cachedInvalidate(timeToLive).map((tuple) => tuple.get(0))
}
