import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import * as C from "../Cause/cause"
import { haltWith } from "./core"

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 *
 * @trace call
 */
export function fail<E>(e: E) {
  const trace = accessCallTrace()
  return haltWith(traceFrom(trace, (trace) => C.traced(C.fail(e), trace())))
}
