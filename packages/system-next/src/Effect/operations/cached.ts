import type { HasClock } from "../../Clock"
import type { Effect, IO } from "../definition"
import { cachedInvalidate_ } from "./cachedInvalidate"
import { map_ } from "./map"

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 */
export function cached_<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: number,
  __trace?: string
): Effect<R & HasClock, never, IO<E, A>> {
  return map_(cachedInvalidate_(self, timeToLive, __trace), (_) => _.get(0))
}

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration.
 *
 * @ets_data_first cached_
 */
export function cached(timeToLive: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasClock, never, IO<E, A>> =>
    cached_(self, timeToLive, __trace)
}
