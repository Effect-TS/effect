/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @tsplus fluent ets/Effect cached
 */
export function cached_<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: Duration,
  __tsplusTrace?: string
): Effect<R, never, IO<E, A>> {
  return self.cachedInvalidate(timeToLive).map((tuple) => tuple.get(0));
}

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @tsplus static ets/Effect/Aspects cached
 */
export const cached = Pipeable(cached_);
