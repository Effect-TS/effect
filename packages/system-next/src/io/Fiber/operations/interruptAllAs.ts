import * as Iter from "../../../collection/immutable/Iterable"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { FiberId } from "../../FiberId"
import type { Fiber } from "../definition"

export function interruptAllAs_(
  fibers: Iterable<Fiber<any, any>>,
  fiberId: FiberId,
  __etsTrace?: string
): UIO<void> {
  return Iter.reduce_(fibers, Effect.unit, (io, fiber) =>
    io.zipLeft(fiber.interruptAs(fiberId))
  )
}

/**
 * Interrupts all fibers as by the specified fiber, awaiting their
 * interruption.
 *
 * @ets_data_first interruptAllAs_
 */
export function interruptAllAs(fiberId: FiberId, __etsTrace?: string) {
  return (fibers: Iterable<Fiber<any, any>>): UIO<void> =>
    interruptAllAs_(fibers, fiberId)
}
