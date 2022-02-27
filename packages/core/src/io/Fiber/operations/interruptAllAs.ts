import * as Iter from "../../../collection/immutable/Iterable"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { FiberId } from "../../FiberId"
import type { Fiber } from "../definition"

/**
 * Interrupts all fibers as by the specified fiber, awaiting their
 * interruption.
 *
 * @tsplus static ets/FiberOps interruptAllAs
 */
export function interruptAllAs(
  fibers: Iterable<Fiber<any, any>>,
  fiberId: FiberId,
  __tsplusTrace?: string
): UIO<void> {
  return Iter.reduce_(fibers, Effect.unit, (io, fiber) =>
    io.zipLeft(fiber.interruptAs(fiberId))
  )
}
