import { interrupt as causeInterrupt } from "../../Cause/definition"
import { interruptors as causeInterruptors } from "../../Cause/operations/interruptors"
import { isInterrupted as causeIsInterrupted } from "../../Cause/operations/isInterrupted"
import type * as HashSet from "../../Collections/Immutable/HashSet"
import { join as fiberJoin } from "../../Fiber/operations/join"
import type * as FiberId from "../../FiberId"
import type { InterruptStatus } from "../../InterruptStatus"
import { Interruptible, Uninterruptible } from "../../InterruptStatus"
import type { Effect } from "../definition"
import { ICheckInterrupt, IInterruptStatus } from "../definition"
import { chain_ } from "./chain"
import { failCause } from "./failCause"
import { fiberId } from "./fiberId"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { forkDaemon } from "./forkDaemon"
import { succeedNow } from "./succeedNow"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
  readonly restore: <R, E, A>(
    effect: Effect<R, E, A>,
    __trace?: string
  ) => Effect<R, E, A>
  readonly force: <R, E, A>(
    effect: Effect<R, E, A>,
    __trace?: string
  ) => Effect<R, E, A>
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {
    this.restore = this.restore.bind(this)
    this.force = this.force.bind(this)
  }

  restore<R, E, A>(effect: Effect<R, E, A>, __trace?: string): Effect<R, E, A> {
    return interruptStatus_(effect, this.flag, __trace)
  }

  force<R, E, A>(effect: Effect<R, E, A>, __trace?: string): Effect<R, E, A> {
    if (this.flag.isUninterruptible) {
      return interruptible(disconnect(uninterruptible(effect)), __trace)
    }
    return interruptStatus_(effect, this.flag, __trace)
  }
}

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

/**
 * Returns an effect that is interrupted by the current fiber
 *
 * @ets static ets/EffectOps interrupt
 */
export const interrupt = chain_(fiberId, interruptAs)

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @ets fluent ets/Effect interruptStatus
 */
export function interruptStatus_<R, E, A>(
  self: Effect<R, E, A>,
  flag: InterruptStatus,
  __trace?: string
): Effect<R, E, A> {
  return new IInterruptStatus(self, flag, __trace)
}

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @ets_data_first interruptStatus_
 */
export function interruptStatus(flag: InterruptStatus, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    interruptStatus_(self, flag, __trace)
}

/**
 * Returns a new effect that performs the same operations as this effect, but
 * interruptibly, even if composed inside of an uninterruptible region.
 *
 * Note that effects are interruptible by default, so this function only has
 * meaning if used within an uninterruptible region.
 *
 * **WARNING**: This operator "punches holes" into effects, allowing them to be
 * interrupted in unexpected places. Do not use this operator unless you know
 * exactly what you are doing. Instead, you should use `uninterruptibleMask`.
 *
 * @ets fluent ets/Effect interruptible
 */
export function interruptible<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return interruptStatus_(self, Interruptible, __trace)
}

/**
 * Performs this effect uninterruptibly. This will prevent the effect from
 * being terminated externally, but the effect may fail for internal reasons
 * (e.g. an uncaught error) or terminate due to defect.
 *
 * Uninterruptible effects may recover from all failure causes (including
 * interruption of an inner effect that has been made interruptible).
 *
 * @ets fluent ets/Effect uninterruptible
 */
export function uninterruptible<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return interruptStatus_(self, Uninterruptible, __trace)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @ets static ets/EffectOps checkInterruptible
 */
export function checkInterruptible<R, E, A>(
  f: (interruptStatus: InterruptStatus) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new ICheckInterrupt(f, __trace)
}

/**
 * Makes the effect interruptible, but passes it a restore function that can
 * be used to restore the inherited interruptibility from whatever region the
 * effect is composed into.
 *
 * @ets static ets/EffectOps interruptibleMask
 */
export function interruptibleMask<R, E, A>(
  f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return checkInterruptible((flag) =>
    interruptible(f(new InterruptStatusRestoreImpl(flag)))
  )
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that can
 * be used to restore the inherited interruptibility from whatever region the
 * effect is composed into.
 *
 * @ets static ets/EffectOps uninterruptibleMask
 */
export function uninterruptibleMask<R, E, A>(
  f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return checkInterruptible((flag) =>
    uninterruptible(f(new InterruptStatusRestoreImpl(flag)))
  )
}

/**
 * Returns an effect whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 *
 * @ets fluent ets/Effect disconnect
 */
export function disconnect<R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return uninterruptibleMask(
    ({ restore }) =>
      chain_(fiberId, (id) =>
        chain_(forkDaemon(restore(effect)), (fiber) =>
          onInterrupt_(restore(fiberJoin(fiber)), () =>
            forkDaemon(fiber.interruptAs(id))
          )
        )
      ),
    __trace
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @ets fluent ets/Effect onInterrupt
 */
export function onInterrupt_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>,
  __trace?: string
): Effect<R & R2, E, A> {
  return uninterruptibleMask((status) =>
    foldCauseEffect_(
      status.restore(self),
      (cause) =>
        causeIsInterrupted(cause)
          ? chain_(cleanup(causeInterruptors(cause)), () => failCause(cause))
          : failCause(cause),
      succeedNow,
      __trace
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @ets_data_first onInterrupt_
 */
export function onInterrupt<R2, X>(
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E, A> =>
    onInterrupt_(self, cleanup, __trace)
}

// TOSO(Mike/Max): Rename

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 *
 * @ets fluent ets/Effect onInterruptPolymorphic
 */
export function onInterruptExtended_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, E2, X>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return uninterruptibleMask(({ restore }) =>
    foldCauseEffect_(
      restore(self),
      (cause) =>
        causeIsInterrupted(cause)
          ? foldCauseEffect_(
              cleanup(causeInterruptors(cause)),
              (_) => failCause(_),
              () => failCause(cause)
            )
          : failCause(cause),
      succeedNow,
      __trace
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 *
 * @ets_data_first onInterruptExtended_
 */
export function onInterruptExtended<R2, E2, X>(
  cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, E2, X>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    onInterruptExtended_(self, cleanup, __trace)
}

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 *
 * @ets static ets/EffectOps interruptAs
 */
export function interruptAs(fiberId: FiberId.FiberId, __trace?: string) {
  return failCause(causeInterrupt(fiberId), __trace)
}
