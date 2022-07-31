import { ICheckInterrupt, IInterruptStatus } from "@effect/core/io/Effect/definition/primitives"

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
  readonly restore: <R, E, A>(
    effect: LazyArg<Effect<R, E, A>>
  ) => Effect<R, E, A>
  /**
   * Returns a new effect that, if the parent region is uninterruptible, can
   * be interrupted in the background instantaneously. If the parent region is
   * interruptible, then the effect can be interrupted normally, in the
   * foreground.
   */
  readonly force: <R, E, A>(
    effect: LazyArg<Effect<R, E, A>>
  ) => Effect<R, E, A>
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {}

  restore = <R, E, A>(
    effect: LazyArg<Effect<R, E, A>>
  ): Effect<R, E, A> => {
    return Effect.suspendSucceed(effect().interruptStatus(this.flag))
  }

  force = <R, E, A>(
    effect: LazyArg<Effect<R, E, A>>
  ): Effect<R, E, A> => {
    return Effect.suspendSucceed(
      this.flag.isUninterruptible
        ? effect().uninterruptible.disconnect.interruptible
        : effect().interruptStatus(this.flag)
    )
  }
}

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

/**
 * Returns an effect that is interrupted by the current fiber
 *
 * @tsplus static effect/core/io/Effect.Ops interrupt
 */
export const interrupt = Effect.fiberId.flatMap((fiberId) => Effect.interruptAs(fiberId))

/**
 * Switches the interrupt status for this effect. If `true` is used, then the
 * effect becomes interruptible (the default), while if `false` is used, then
 * the effect becomes uninterruptible. These changes are compositional, so
 * they only affect regions of the effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects interruptStatus
 * @tsplus pipeable effect/core/io/Effect interruptStatus
 */
export function interruptStatus(flag: LazyArg<InterruptStatus>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => new IInterruptStatus(self, flag)
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
 * @tsplus getter effect/core/io/Effect interruptible
 */
export function interruptible<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return self.interruptStatus(InterruptStatus.Interruptible)
}

/**
 * Performs this effect uninterruptibly. This will prevent the effect from
 * being terminated externally, but the effect may fail for internal reasons
 * (e.g. an uncaught error) or terminate due to defect.
 *
 * Uninterruptible effects may recover from all failure causes (including
 * interruption of an inner effect that has been made interruptible).
 *
 * @tsplus getter effect/core/io/Effect uninterruptible
 */
export function uninterruptible<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return self.interruptStatus(InterruptStatus.Uninterruptible)
}

/**
 * Checks the interrupt status, and produces the effect returned by the
 * specified callback.
 *
 * @tsplus static effect/core/io/Effect.Ops checkInterruptible
 */
export function checkInterruptible<R, E, A>(
  f: (interruptStatus: InterruptStatus) => Effect<R, E, A>
): Effect<R, E, A> {
  return new ICheckInterrupt(f)
}

/**
 * Makes the effect interruptible, but passes it a restore function that can
 * be used to restore the inherited interruptibility from whatever region the
 * effect is composed into.
 *
 * @tsplus static effect/core/io/Effect.Ops interruptibleMask
 */
export function interruptibleMask<R, E, A>(
  f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>
): Effect<R, E, A> {
  return checkInterruptible((flag) => f(new InterruptStatusRestoreImpl(flag)).interruptible)
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that can
 * be used to restore the inherited interruptibility from whatever region the
 * effect is composed into.
 *
 * @tsplus static effect/core/io/Effect.Ops uninterruptibleMask
 */
export function uninterruptibleMask<R, E, A>(
  f: (statusRestore: InterruptStatusRestore) => Effect<R, E, A>
): Effect<R, E, A> {
  return checkInterruptible((flag) => f(new InterruptStatusRestoreImpl(flag)).uninterruptible)
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
 * @tsplus getter effect/core/io/Effect disconnect
 */
export function disconnect<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    Do(($) => {
      const id = $(Effect.fiberId)
      const fiber = $(restore(self).forkDaemon)
      return $(restore(fiber.join).onInterrupt(() => fiber.interruptAs(id).forkDaemon))
    })
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects onInterrupt
 * @tsplus pipeable effect/core/io/Effect onInterrupt
 */
export function onInterrupt<R2, X>(
  cleanup: (interruptors: HashSet<FiberId>) => Effect<R2, never, X>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self).foldCauseEffect(
        (cause) =>
          cause.isInterrupted
            ? cleanup(cause.interruptors).zipRight(Effect.failCause(cause))
            : Effect.failCause(cause),
        Effect.succeed
      )
    )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 *
 * @tsplus static effect/core/io/Effect.Aspects onInterruptPolymorphic
 * @tsplus pipeable effect/core/io/Effect onInterruptPolymorphic
 */
export function onInterruptPolymorphic<R2, E2, X>(
  cleanup: (interruptors: HashSet<FiberId>) => Effect<R2, E2, X>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self).foldCauseEffect(
        (cause) =>
          cause.isInterrupted
            ? cleanup(cause.interruptors).foldCauseEffect(
              (_) => Effect.failCause(_),
              () => Effect.failCause(cause)
            )
            : Effect.failCause(cause),
        Effect.succeed
      )
    )
}

/**
 * Returns an effect that is interrupted as if by the specified fiber.
 *
 * @tsplus static effect/core/io/Effect.Ops interruptAs
 */
export function interruptAs(fiberId: LazyArg<FiberId>) {
  return Effect.failCauseSync(Cause.interrupt(fiberId()))
}
