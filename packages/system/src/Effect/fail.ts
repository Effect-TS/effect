// ets_tracing: off

import * as C from "../Cause/cause.js"
import { haltWith } from "./core.js"

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 */
export function fail<E>(e: E, __trace?: string) {
  return haltWith((trace) => C.traced(C.fail(e), trace()), __trace)
}

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 */
export function failWith<E>(e: () => E, __trace?: string) {
  return haltWith((trace) => C.traced(C.fail(e()), trace()), __trace)
}
