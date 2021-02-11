// tracing: off
import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import * as O from "../Option"
import type { Effect } from "./effect"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @trace call
 */
export function asSomeError<R, E, A>(self: Effect<R, E, A>) {
  const trace = accessCallTrace()
  const f = traceFrom(trace, O.some)
  return mapError_(self, f)
}
