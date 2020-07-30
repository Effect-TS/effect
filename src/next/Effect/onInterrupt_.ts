import * as S from "../../Set"
import * as Cause from "../Cause/core"
import { FiberID } from "../Fiber/id"

import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { halt } from "./halt"
import { succeedNow } from "./succeedNow"
import { uninterruptibleMask } from "./uninterruptibleMask"

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
        Cause.interrupted(cause)
          ? chain_(cleanup(Cause.interruptors(cause)), () => halt(cause))
          : halt(cause),
      succeedNow
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
              (_) => halt(Cause.Then(cause, _)),
              () => halt(cause)
            )
          : halt(cause),
      succeedNow
    )
  )
