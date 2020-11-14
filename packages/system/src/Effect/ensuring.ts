import { Then } from "../Cause/cause"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { uninterruptibleMask } from "./uninterruptibleMask"

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
export function ensuring<R1>(finalizer: Effect<R1, never, any>) {
  return <R, E, A>(effect: Effect<R, E, A>) => ensuring_(effect, finalizer)
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
export function ensuring_<R, E, A, R1>(
  effect: Effect<R, E, A>,
  finalizer: Effect<R1, never, any>
) {
  return uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(effect),
      (cause1) =>
        foldCauseM_(
          finalizer,
          (cause2) => halt(Then(cause1, cause2)),
          (_) => halt(cause1)
        ),
      (value) =>
        foldCauseM_(
          finalizer,
          (cause1) => halt(cause1),
          (_) => succeed(value)
        )
    )
  )
}
