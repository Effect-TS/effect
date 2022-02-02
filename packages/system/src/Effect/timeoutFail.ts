// ets_tracing: off

import type { Clock } from "../Clock"
import type { Has } from "../Has"
import { succeed, suspend } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { flatten } from "./flatten"
import { timeoutTo_ } from "./timeoutTo"

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 *
 * @ets_data_first timeoutFail_
 */
export function timeoutFail<E2>(d: number, e: () => E2, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => timeoutFail_(self, d, e, __trace)
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event
 * of timeout, it will produce the specified error.
 */
export function timeoutFail_<R, E, E2, A>(
  self: Effect<R, E, A>,
  d: number,
  e: () => E2,
  __trace?: string
): Effect<R & Has<Clock>, E | E2, A> {
  return flatten(
    timeoutTo_(
      self,
      d,
      suspend(() => fail(e())),
      succeed,
      __trace
    )
  )
}
