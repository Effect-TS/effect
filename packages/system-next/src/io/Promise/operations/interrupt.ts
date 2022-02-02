import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Promise } from "../definition"

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 *
 * @tsplus fluent ets/Promise interrupt
 */
export function interrupt<E, A>(
  self: Promise<E, A>,
  __etsTrace?: string
): UIO<boolean> {
  return Effect.fiberId.flatMap((id) => self.completeWith(Effect.interruptAs(id)))
}
