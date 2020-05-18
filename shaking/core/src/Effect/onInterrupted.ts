import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { combineFinalizerExit } from "./combineFinalizerExit"
import { completed } from "./completed"
import { result } from "./result"
import { uninterruptibleMask } from "./uninterruptibleMask"

export function onInterrupted<S2, R2, E2>(finalizer: Effect<S2, R2, E2, unknown>) {
  return <S, R, E, A>(ioa: Effect<S, R, E, A>) => onInterrupted_(ioa, finalizer)
}

/**
 * Guarantee that once ioa begins executing if it is interrupted finalizer will execute
 * @param ioa
 * @param finalizer
 */
export function onInterrupted_<S, R, E, A, S2, R2, E2>(
  ioa: Effect<S, R, E, A>,
  finalizer: Effect<S2, R2, E2, unknown>
): Effect<S | S2, R & R2, E | E2, A> {
  return uninterruptibleMask((cutout) =>
    chain_(result(cutout(ioa)), (exit) =>
      exit._tag === "Interrupt"
        ? chain_(result(finalizer), (finalize) =>
            completed(combineFinalizerExit(exit, finalize))
          )
        : completed(exit)
    )
  )
}
