// tracing: off

import { accessCallTrace, traceCall } from "@effect-ts/tracing-utils"

import type { Clock } from "../Clock"
import { pipe } from "../Function"
import type { Has } from "../Has"
import { cachedInvalidate_ } from "./cachedInvalidate"
import type { Effect, IO, RIO } from "./effect"
import { map } from "./map"

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 *
 * @trace call
 * @dataFirst cached_
 */
export function cached(ttl: number) {
  const trace = accessCallTrace()
  return traceCall(<R, E, A>(fa: Effect<R, E, A>) => cached_(fa, ttl), trace)
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 *
 * @trace call
 */
export function cached_<R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number
): RIO<R & Has<Clock>, IO<E, A>> {
  const trace = accessCallTrace()
  return pipe(
    traceCall(cachedInvalidate_, trace)(fa, ttl),
    map(([cachedEffect, _]) => cachedEffect)
  )
}
