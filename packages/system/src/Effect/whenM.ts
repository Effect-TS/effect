// tracing: off

import { traceCall } from "@effect-ts/tracing-utils"

import { asUnit } from "./asUnit"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM_<R1, E1, A, R, E>(
  self: Effect<R1, E1, A>,
  predicate: Effect<R, E, boolean>,
  __trace?: string
) {
  return chain_(predicate, (a) => (a ? traceCall(asUnit, __trace)(self) : unit))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM<R, E>(predicate: Effect<R, E, boolean>, __trace?: string) {
  return <R1, E1, A>(self: Effect<R1, E1, A>) => whenM_(self, predicate, __trace)
}
