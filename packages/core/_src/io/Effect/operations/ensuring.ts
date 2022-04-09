import { IEnsuring } from "@effect/core/io/Effect/definition/primitives";

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `acquireReleaseWith`.
 *
 * @tsplus fluent ets/Effect ensuring
 */
export function ensuring_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  finalizer: LazyArg<Effect<R1, never, X>>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return Effect.suspendSucceed(new IEnsuring(self, finalizer, __tsplusTrace));
}

/**
 * Returns an effect that, if this effect _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this effect
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the effect's result, see `onExit`.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `acquireReleaseWith`.
 *
 * @tsplus static ets/Effect/Aspects ensuring
 */
export const ensuring = Pipeable(ensuring_);
