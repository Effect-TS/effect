import { fold_ } from "../../../data/Either"
import { failureOrCause } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { failNow } from "./failNow"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @ets fluent ets/Effect mapError
 */
export function mapError_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  __etsTrace?: string
): Effect<R, E2, A> {
  return foldCauseEffect_(
    self,
    (c) => fold_(failureOrCause(c), (e) => failNow(f(e)), failCause),
    succeedNow,
    __etsTrace
  )
}

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E2>(f: (e: E) => E2, __etsTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E2, A> =>
    mapError_(self, f, __etsTrace)
}
