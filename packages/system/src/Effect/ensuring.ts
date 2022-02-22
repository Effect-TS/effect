// ets_tracing: off

import { combineSeq } from "../Cause/cause.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { uninterruptibleMask } from "./interruption.js"

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R1, X>(finalizer: Effect<R1, never, X>, __trace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>) => ensuring_(effect, finalizer, __trace)
}

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 */
export function ensuring_<R, E, A, R1, X>(
  effect: Effect<R, E, A>,
  finalizer: Effect<R1, never, X>,
  __trace?: string
) {
  return uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(effect),
      (cause1) =>
        foldCauseM_(
          finalizer,
          (cause2) => halt(combineSeq(cause1, cause2)),
          (_) => halt(cause1)
        ),
      (value) =>
        foldCauseM_(
          finalizer,
          (cause1) => halt(cause1),
          (_) => succeed(value)
        ),
      __trace
    )
  )
}
