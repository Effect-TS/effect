import { constFalse, constTrue } from "../../../data/Function"
import type { Managed } from "../definition"

/**
 * Returns whether this managed effect is a failure.
 *
 * @tsplus fluent ets/Managed isFailure
 */
export function isFailure<R, E, A>(self: Managed<R, E, A>, __etsTrace?: string) {
  return self.fold(constTrue, constFalse)
}
