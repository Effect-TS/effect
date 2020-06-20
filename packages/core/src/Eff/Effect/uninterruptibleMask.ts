import * as S from "../../Set"
import { interrupted } from "../Cause/interrupted"
import { interruptors } from "../Cause/interruptors"
import { FiberID } from "../Fiber/id"
import { InterruptStatus } from "../Fiber/interruptStatus"
import { join } from "../Fiber/join"

import { chain_ } from "./chain_"
import { checkInterrupt } from "./checkInterrupt"
import { AsyncRE, Effect } from "./effect"
import { fiberId } from "./fiberId"
import { foldCauseM_ } from "./foldCauseM_"
import { forkDaemon } from "./forkDaemon"
import { halt } from "./halt"
import { interruptStatus_ } from "./interruptStatus_"
import { interruptible } from "./interruptible"
import { succeedNow } from "./succeedNow"
import { uninterruptible } from "./uninterruptible"

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
  readonly restore: <S, R, E, A>(effect: Effect<S, R, E, A>) => Effect<S, R, E, A>
  readonly force: <S, R, E, A>(effect: Effect<S, R, E, A>) => AsyncRE<R, E, A>
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {
    this.restore = this.restore.bind(this)
    this.force = this.force.bind(this)
  }

  restore<S, R, E, A>(effect: Effect<S, R, E, A>): Effect<S, R, E, A> {
    return interruptStatus_(effect, this.flag)
  }

  force<S, R, E, A>(effect: Effect<S, R, E, A>): AsyncRE<R, E, A> {
    if (this.flag.isUninteruptible) {
      return interruptible(disconnect(uninterruptible(effect)))
    }
    return interruptStatus_(effect, this.flag)
  }
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export const uninterruptibleMask = <S, R, E, A>(
  f: (restore: InterruptStatusRestore) => Effect<S, R, E, A>
) => checkInterrupt((flag) => uninterruptible(f(new InterruptStatusRestoreImpl(flag))))

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
 */
export const disconnect = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  uninterruptibleMask(({ restore }) =>
    chain_(fiberId(), (id) =>
      chain_(forkDaemon(restore(effect)), (fiber) =>
        onInterrupt_(restore(join(fiber)), () => forkDaemon(fiber.interruptAs(id)))
      )
    )
  )

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export const onInterrupt_ = <S, R, E, A, S2, R2>(
  self: Effect<S, R, E, A>,
  cleanup: (interruptors: S.Set<FiberID>) => Effect<S2, R2, never, any>
) =>
  uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(self),
      (cause) =>
        interrupted(cause)
          ? chain_(cleanup(interruptors(cause)), () => halt(cause))
          : halt(cause),
      succeedNow
    )
  )
