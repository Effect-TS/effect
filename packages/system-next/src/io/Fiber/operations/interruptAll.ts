import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Fiber } from "../definition"
import { interruptAllAs_ } from "./interruptAllAs"

/**
 * Interrupts all fibers, awaiting their interruption.
 */
export function interruptAll(
  fibers: Iterable<Fiber<any, any>>,
  __etsTrace?: string
): UIO<void> {
  return Effect.fiberId.flatMap((fiberId) => interruptAllAs_(fibers, fiberId))
}
