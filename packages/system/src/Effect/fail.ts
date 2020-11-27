import { traceAsFrom } from "@effect-ts/tracing-utils"

import * as C from "../Cause/cause"
import { haltWith } from "./core"

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 *
 * @tracecall fail
 */
export function fail<E>(e: E) {
  // tracing: off
  return haltWith(traceAsFrom("fail", fail, (trace) => C.traced(C.fail(e), trace())))
  // tracing: on
}
