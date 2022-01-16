// ets_tracing: off

import type { FiberId } from "../../FiberId"
import * as Iter from "../../Iterable"
import type { Fiber } from "../definition"
import * as T from "./_internal/effect-api"

/**
 * Interrupts all fibers as by the specified fiber, awaiting their
 * interruption.
 */
export function interruptAllAs(fiberId: FiberId) {
  return (fibers: Iterable<Fiber<any, any>>): T.UIO<void> =>
    Iter.reduce_(fibers, T.unit, (io, fiber) =>
      T.zipLeft_(io, fiber.interruptAs(fiberId))
    )
}
