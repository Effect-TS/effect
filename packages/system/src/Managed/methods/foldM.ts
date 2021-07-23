// ets_tracing: off

import { failureOrCause } from "../../Cause"
import * as E from "../../Either"
import { pipe } from "../../Function"
import { foldCauseM_ } from "../core"
import type { Managed } from "../managed"
import { halt } from "./halt"

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 *
 * @ets_data_first foldM_
 */
export function foldM<R, E, A, R1, E1, B, R2, E2, C>(
  failure: (e: E) => Managed<R1, E1, B>,
  success: (a: A) => Managed<R2, E2, C>,
  __trace?: string
) {
  return (self: Managed<R, E, A>) => foldM_(self, failure, success, __trace)
}

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  self: Managed<R, E, A>,
  failure: (e: E) => Managed<R1, E1, B>,
  success: (a: A) => Managed<R2, E2, C>,
  __trace?: string
) {
  return foldCauseM_(
    self,
    (x) => pipe(x, failureOrCause, E.fold(failure, halt)),
    success,
    __trace
  )
}
