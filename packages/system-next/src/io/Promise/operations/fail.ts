import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @tsplus fluent ets/Promise fail
 */
export function fail_<E, A>(
  self: Promise<E, A>,
  e: LazyArg<E>,
  __etsTrace?: string
): UIO<boolean> {
  return self.completeWith(Effect.fail(e), __etsTrace)
}

/**
 * Fails the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first fail_
 */
export function fail<E>(e: LazyArg<E>, __etsTrace?: string) {
  return <A>(self: Promise<E, A>): UIO<boolean> => self.fail(e)
}
