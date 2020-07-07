import { chain_ } from "../Effect/chain_"
import { done as effectDone } from "../Effect/done"
import { AsyncE } from "../Effect/effect"
import { tap_ } from "../Effect/tap_"

import { Fiber } from "./fiber"

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by another
 * fiber, "inner interruption" can be caught and recovered.
 */
export const join = <E, A>(fiber: Fiber<E, A>): AsyncE<E, A> =>
  tap_(chain_(fiber.wait, effectDone), () => fiber.inheritRefs)
