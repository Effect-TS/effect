// tracing: off

import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import { access } from "./core"

/**
 * Access environment
 *
 * @trace call
 */
export function environment<R>() {
  const trace = accessCallTrace()
  return access(traceFrom(trace, (_: R) => _))
}
