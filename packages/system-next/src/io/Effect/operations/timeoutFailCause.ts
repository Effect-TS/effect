import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import type { HasClock } from "../../Clock"
import { Effect } from "../definition"

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @ets fluent ets/Effect timeoutFailCause
 */
export function timeoutFailCause_<R, E, E1, A>(
  self: Effect<R, E, A>,
  cause: LazyArg<Cause<E1>>,
  milliseconds: number,
  __etsTrace?: string
): Effect<R & HasClock, E | E1, A> {
  return self
    .timeoutTo(
      Effect.failCause(() => cause()),
      Effect.succeedNow,
      milliseconds
    )
    .flatten()
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @ets_data_first timeoutFailCause_
 */
export function timeoutFailCause<E1>(
  cause: LazyArg<Cause<E1>>,
  milliseconds: number,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasClock, E | E1, A> =>
    timeoutFailCause_(self, cause, milliseconds)
}
