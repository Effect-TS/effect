import { failureOrCause } from "../../Cause"
import * as E from "../../Either"
import { flow } from "../../Function"
import { foldCauseM_ } from "../core"
import type { Managed } from "../managed"
import { halt } from "./halt"

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  self: Managed<R, E, A>,
  failure: (e: E) => Managed<R1, E1, B>,
  success: (a: A) => Managed<R2, E2, C>
) {
  return foldCauseM_(self, flow(failureOrCause, E.fold(failure, halt)), success)
}
