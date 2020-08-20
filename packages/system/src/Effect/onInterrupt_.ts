import * as Cause from "../Cause/core"
import type { FiberID } from "../Fiber/id"
import { chain_, foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export const onInterrupt_ = <S, R, E, A, S2, R2>(
  self: Effect<S, R, E, A>,
  cleanup: (interruptors: ReadonlySet<FiberID>) => Effect<S2, R2, never, any>
) =>
  uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(self),
      (cause) =>
        Cause.interrupted(cause)
          ? chain_(cleanup(Cause.interruptors(cause)), () => halt(cause))
          : halt(cause),
      succeed
    )
  )

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export const onInterruptExtended_ = <S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  cleanup: () => Effect<S2, R2, E2, any>
) =>
  uninterruptibleMask(({ restore }) =>
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
