import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @tsplus fluent ets/Promise die
 */
export function die_<E, A>(
  self: Promise<E, A>,
  defect: LazyArg<unknown>,
  __etsTrace?: string
): UIO<boolean> {
  return self.completeWith(Effect.die(defect))
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @ets_data_first die_
 */
export function die(defect: LazyArg<unknown>, __etsTrace?: string) {
  return <E, A>(self: Promise<E, A>): UIO<boolean> => self.die(defect)
}
