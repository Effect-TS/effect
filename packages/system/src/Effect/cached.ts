// ets_tracing: off

import type { Clock } from "../Clock/index.js"
import type { Has } from "../Has/index.js"
import { cachedInvalidate_ } from "./cachedInvalidate.js"
import type { Effect, IO, RIO } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 *
 * @ets_data_first cached_
 */
export function cached(ttl: number, __trace?: string) {
  return <R, E, A>(fa: Effect<R, E, A>) => cached_(fa, ttl)
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached_<R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number,
  __trace?: string
): RIO<R & Has<Clock>, IO<E, A>> {
  return map_(
    cachedInvalidate_(fa, ttl, __trace),
    ({ tuple: [cachedEffect, _] }) => cachedEffect
  )
}
