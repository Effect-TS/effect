import type { HashSet } from "../../../collection/immutable/HashSet"
import type { FiberId } from "../../FiberId"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @tsplus fluent ets/Effect onInterruptWith
 */
export function onInterruptWith_<R, E, A, R1, X>(
  self: Effect<R, E, A>,
  cleanup: (set: HashSet<FiberId>) => RIO<R1, X>,
  __etsTrace?: string
): Effect<R & R1, E, A> {
  return Effect.uninterruptibleMask(({ restore }) =>
    restore(self).foldCauseEffect(
      (cause) =>
        cause.isInterrupted()
          ? cleanup(cause.interruptors()) > Effect.failCause(cause)
          : Effect.failCause(cause),
      Effect.succeedNow
    )
  )
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 *
 * @ets_data_first onInterruptWith_
 */
export function onInterruptWith<R1, X>(
  cleanup: (set: HashSet<FiberId>) => RIO<R1, X>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> =>
    self.onInterruptWith(cleanup)
}
