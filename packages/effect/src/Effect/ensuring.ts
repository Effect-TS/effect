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
export const ensuring = <S, R>(finalizer: Effect<S, R, never, any>) => <S1, R1, E, A>(
  effect: Effect<S1, R1, E, A>
) =>
  uninterruptibleMask(({ restore }) =>
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
