import type { Cause } from "../../Cause"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * @tsplus fluent ets/Effect onDoneCause
 */
export function onDoneCause_<R, E, A, R1, X1, R2, X2>(
  self: Effect<R, E, A>,
  error: (e: Cause<E>) => RIO<R1, X1>,
  success: (a: A) => RIO<R2, X2>,
  __tsplusTrace?: string
): RIO<R & R1 & R2, void> {
  return Effect.uninterruptibleMask(({ restore }) =>
    restore(self)
      .foldCauseEffect(
        (e) => restore(error(e)),
        (s) => restore(success(s))
      )
      .forkDaemon()
      .asUnit()
  )
}

/**
 * @ets_data_first onDoneCause_
 */
export function onDoneCause<E, A, R1, X1, R2, X2>(
  error: (e: Cause<E>) => RIO<R1, X1>,
  success: (a: A) => RIO<R2, X2>,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): RIO<R & R1 & R2, void> =>
    self.onDoneCause(error, success)
}
