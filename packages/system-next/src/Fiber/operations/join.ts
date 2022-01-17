import type { IO } from "../../Effect"
import { chain_ } from "../../Effect/operations/chain"
import { done } from "../../Effect/operations/done"
import { zipLeft_ } from "../../Effect/operations/zipLeft"
import type { Fiber } from "../definition"

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by
 * another fiber, "inner interruption" can be caught and recovered.
 */
export function join<E, A>(self: Fiber<E, A>, __trace?: string): IO<E, A> {
  return zipLeft_(chain_(self.await, done), self.inheritRefs)
}
