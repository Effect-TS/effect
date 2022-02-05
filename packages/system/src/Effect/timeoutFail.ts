// ets_tracing: off

import type { Clock } from "../Clock/index.js"
import type { Has } from "../Has/index.js"
import { succeed, suspend } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { flatten } from "./flatten.js"
import { timeoutTo_ } from "./timeoutTo.js"

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
