// tracing: off
import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import type { Tag } from "../Has"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to a service.
 *
 * @datFirst asService_
 * @trace call
 */
export function asService<A>(has: Tag<A>) {
  const trace = accessCallTrace()
  return traceCall(<R, E>(fa: Effect<R, E, A>) => asService_(fa, has), trace)
}

/**
 * Maps the success value of this effect to a service.
 *
 * @trace call
 */
export function asService_<R, E, A>(fa: Effect<R, E, A>, has: Tag<A>) {
  const trace = accessCallTrace()
  return map_(fa, traceFrom(trace, has.of))
}
