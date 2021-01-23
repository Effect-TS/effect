import type { InterruptStatus } from "../Fiber/core"
import { checkInterruptible, interruptStatus_ } from "./core"
import { disconnect } from "./disconnect"
import type { Effect } from "./effect"
import { interruptible } from "./interruptible"
import { uninterruptible } from "./uninterruptible"

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
  readonly restore: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  readonly force: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {
    this.restore = this.restore.bind(this)
    this.force = this.force.bind(this)
  }

  restore<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
    return interruptStatus_(effect, this.flag)
  }

  force<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
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
export function uninterruptibleMask<R, E, A>(
  f: (restore: InterruptStatusRestore) => Effect<R, E, A>
) {
  return checkInterruptible((flag) =>
    uninterruptible(f(new InterruptStatusRestoreImpl(flag)))
  )
}
