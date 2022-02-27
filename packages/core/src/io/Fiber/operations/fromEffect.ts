import type { IO, UIO } from "../../Effect"
import { Fiber } from "../definition"

/**
 * Lifts an `Effect` into a `Fiber`.
 *
 * @tsplus static ets/FiberOps fromEffect
 */
export function fromEffect<E, A>(
  effect: IO<E, A>,
  __tsplusTrace?: string
): UIO<Fiber<E, A>> {
  return effect.exit().map(Fiber.done)
}
