import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { FiberId } from "../../FiberId"
import type { Promise } from "../definition"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 *
 * @tsplus fluent ets/Promise interruptAs
 */
export function interruptAs_<E, A>(
  self: Promise<E, A>,
  fiberId: LazyArg<FiberId>,
  __tsplusTrace?: string
): UIO<boolean> {
  return self.completeWith(Effect.interruptAs(fiberId))
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 *
 * @ets_data_first interruptAs_
 */
export function interruptAs(fiberId: LazyArg<FiberId>, __tsplusTrace?: string) {
  return <E, A>(self: Promise<E, A>): UIO<boolean> => self.interruptAs(fiberId)
}
