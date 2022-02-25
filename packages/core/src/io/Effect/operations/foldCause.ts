import type { Cause } from "../../Cause"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 *
 * @tsplus fluent ets/Effect foldCause
 */
export function foldCause_<R, E, A, A2, A3>(
  self: Effect<R, E, A>,
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __tsplusTrace?: string
): RIO<R, A2 | A3> {
  return self.foldCauseEffect(
    (c) => Effect.succeedNow(failure(c)),
    (a) => Effect.succeedNow(success(a))
  )
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 *
 * @ets_data_first foldCause_
 */
export function foldCause<E, A, A2, A3>(
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __tsplusTrace?: string
) {
  return <R>(self: Effect<R, E, A>): RIO<R, A2 | A3> => self.foldCause(failure, success)
}
