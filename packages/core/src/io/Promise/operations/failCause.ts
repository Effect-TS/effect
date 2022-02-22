import type { LazyArg } from "../../../data/Function"
import type { Cause } from "../../Cause"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Fails the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @tsplus fluent ets/Promise failCause
 */
export function failCause_<E, A>(
  self: Promise<E, A>,
  cause: LazyArg<Cause<E>>,
  __etsTrace?: string
): UIO<boolean> {
  return self.completeWith(Effect.failCause(cause))
}

/**
 * Fails the promise with the specified cause, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first failCause_
 */
export function failCause<E>(cause: LazyArg<Cause<E>>, __etsTrace?: string) {
  return <A>(self: Promise<E, A>): UIO<boolean> => self.failCause(cause)
}
