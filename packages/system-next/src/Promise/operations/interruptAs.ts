// ets_tracing: off

import type { UIO } from "../../Effect"
import { interruptAs as effectInterruptAs } from "../../Effect/operations/interruption"
import type { FiberId } from "../../FiberId"
import type { Promise } from "../definition"
import { completeWith_ } from "./completeWith"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interruptAs_<E, A>(
  self: Promise<E, A>,
  fiberId: FiberId,
  __trace?: string
): UIO<boolean> {
  return completeWith_(self, effectInterruptAs(fiberId), __trace)
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 *
 * @ets_data_first interruptAs_
 */
export function interruptAs(fiberId: FiberId, __trace?: string) {
  return <E, A>(self: Promise<E, A>): UIO<boolean> =>
    interruptAs_(self, fiberId, __trace)
}
