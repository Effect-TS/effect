// tracing: off

import { accessCallTrace } from "@effect-ts/tracing-utils"

import * as C from "../Cause/cause"
import { haltWith } from "./core"

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 *
 * @trace call
 */
export function fail<E>(e: E) {
  return haltWith((trace) => C.traced(C.fail(e), trace()), accessCallTrace())
}

/**
 * Returns an effect that models failure with the specified error.
 * The moral equivalent of `throw` for pure code.
 */
export function failWith<E>(e: () => E, __trace?: string) {
  return haltWith((trace) => C.traced(C.fail(e()), trace()), __trace)
}
