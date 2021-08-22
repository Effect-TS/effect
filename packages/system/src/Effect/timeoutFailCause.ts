// ets_tracing: off

import type * as CS from "../Cause"
import type * as CL from "../Clock"
import { halt, succeed, suspend } from "./core"
import type { Effect } from "./effect"
import { flatten } from "./flatten"
import { timeoutTo_ } from "./timeoutTo"

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified failure.
 */
export function timeoutFailCause_<R, E, E1, A>(
  self: Effect<R, E, A>,
  cause: () => CS.Cause<E1>,
  d: number,
  __trace?: string
): Effect<R & CL.HasClock, E | E1, A> {
  return flatten(
    timeoutTo_(
      self,
      d,
      suspend(() => halt(cause())),
      (_) => succeed(_),
      __trace
    )
  )
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified failure.
 *
 * @ets_data_first timeoutFailCause_
 */
export function timeoutFailCause<E1>(
  cause: () => CS.Cause<E1>,
  d: number,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>) => timeoutFailCause_(self, cause, d, __trace)
}
