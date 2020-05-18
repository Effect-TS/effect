import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { combineFinalizerExit } from "./combineFinalizerExit"
import { completed } from "./completed"
import { result } from "./result"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Guarantee that once ioa begins executing the finalizer will execute.
 * @param ioa
 * @param finalizer
 */
export function onComplete_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      chain_(result(finalizer), (finalize) =>
        completed(combineFinalizerExit(exit, finalize))
      )
    )
  )
}
