import * as Cause from "../Cause/core"
import type { FiberID } from "../Fiber/id"
import { chain_, foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export function onInterrupt_<R, E, A, R2>(
  self: Effect<R, E, A>,
  cleanup: (interruptors: ReadonlySet<FiberID>) => Effect<R2, never, any>
) {
  return uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(self),
      (cause) =>
        Cause.interrupted(cause)
          ? chain_(cleanup(Cause.interruptors(cause)), () => halt(cause))
          : halt(cause),
      succeed
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export function onInterruptExtended_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  cleanup: () => Effect<R2, E2, any>
) {
  return uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(self),
      (cause) =>
        Cause.interrupted(cause)
          ? foldCauseM_(
              cleanup(),
              (_) => halt(_),
              () => halt(cause)
            )
          : halt(cause),
      succeed
    )
  )
}
