// tracing: off
import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @trace call
 */
export function as_<R, E, A, B>(self: Effect<R, E, A>, b: B) {
  const trace = accessCallTrace()
  return map_(
    self,
    traceFrom(trace, () => b)
  )
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @dataFirst as_
 * @trace call
 */
export function as<B>(b: B) {
  const trace = accessCallTrace()
  return traceCall(<R, E, A>(self: Effect<R, E, A>) => as_(self, b), trace)
}
