import type { IO, UIO } from "../../Effect"
import type { Fiber } from "../definition"
import { done } from "./done"

/**
 * Lifts an `Effect` into a `Fiber`.
 */
export function fromEffect<E, A>(
  effect: IO<E, A>,
  __etsTrace?: string
): UIO<Fiber<E, A>> {
  return effect.exit().map(done)
}
