import { chain_ as effectChain_ } from "../Effect/chain_"
import { fiberId as effectFiberId } from "../Effect/fiberId"

import { Fiber } from "./fiber"

/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interrupt = <E, A>(fiber: Fiber<E, A>) =>
  effectChain_(effectFiberId(), (id) => fiber.interruptAs(id))
