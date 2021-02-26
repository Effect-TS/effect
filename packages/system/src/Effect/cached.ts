import type { Clock } from "../Clock"
import { cachedInvalidate_ } from "./cachedInvalidate"
import { pipe } from "../Function"
import type { Has } from "../Has"
import type { Effect, IO, RIO } from "./effect"
import { map } from "./map"

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached(ttl: number) {
  return <R, E, A>(fa: Effect<R, E, A>) => cached_(fa, ttl)
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached_<S, R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number
): RIO<R & Has<Clock>, IO<E, A>> {
  return pipe(
    cachedInvalidate_(fa, ttl),
    map(([cachedEffect, _]) => cachedEffect)
  )
}
