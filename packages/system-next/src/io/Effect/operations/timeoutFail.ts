import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../Clock"
import { Effect } from "../definition"

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @tsplus fluent ets/Effect timeoutFail
 */
export function timeoutFail_<R, E, E1, A>(
  self: Effect<R, E, A>,
  e: LazyArg<E1>,
  milliseconds: number,
  __etsTrace?: string
): Effect<R & HasClock, E | E1, A> {
  return self.timeoutTo(Effect.fail(e), Effect.succeedNow, milliseconds).flatten()
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @ets_data_first timeoutFail_
 */
export function timeoutFail<E1>(
  cause: LazyArg<E1>,
  milliseconds: number,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasClock, E | E1, A> =>
    self.timeoutFail(cause, milliseconds)
}
