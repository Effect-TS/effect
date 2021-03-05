// tracing: off

import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import { chain_, provideAll_ } from "./core"
import type { Effect } from "./effect"

/**
 * Uses the output of `that` to provide to `self`
 *
 * @dataFirst compose_
 * @trace call
 */
export function compose<A, E1, B>(that: Effect<A, E1, B>) {
  const trace = accessCallTrace()
  return <R, E>(self: Effect<R, E, A>) => traceCall(compose_, trace)(self, that)
}

/**
 * Uses the output of `that` to provide to `self`
 *
 * @trace call
 */
export function compose_<A, E1, B, R, E>(
  self: Effect<R, E, A>,
  that: Effect<A, E1, B>
) {
  const trace = accessCallTrace()
  return chain_(
    self,
    traceFrom(trace, (r) => provideAll_(that, r))
  )
}
