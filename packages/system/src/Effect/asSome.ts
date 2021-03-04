// tracing: off

import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import * as O from "../Option/core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to an optional value.
 *
 * @trace call
 */
export function asSome<R, E, A>(fa: Effect<R, E, A>) {
  const trace = accessCallTrace()
  const f = traceFrom(trace, O.some)
  return map_(fa, f)
}
