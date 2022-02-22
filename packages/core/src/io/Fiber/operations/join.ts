import type { IO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Fiber } from "../definition"

/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by
 * another fiber, "inner interruption" can be caught and recovered.
 */
export function join<E, A>(self: Fiber<E, A>, __etsTrace?: string): IO<E, A> {
  return self.await.flatMap((_) => Effect.done(_)) < self.inheritRefs
}
