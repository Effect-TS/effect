import { checkInterruptible } from "./core"
import type { Effect } from "./effect"
import { interruptible } from "./interruptible"
import type { InterruptStatusRestore } from "./uninterruptibleMask"
import { InterruptStatusRestoreImpl } from "./uninterruptibleMask"

/**
 * Makes the effect interruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export function interruptibleMask<S, R, E, A>(
  f: (restore: InterruptStatusRestore) => Effect<S, R, E, A>
) {
  return checkInterruptible((flag) =>
    interruptible(f(new InterruptStatusRestoreImpl(flag)))
  )
}
