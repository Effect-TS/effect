import { constFalse, constTrue } from "../../../data/Function"
import type { Managed } from "../definition"

/**
 * Returns whether this managed effect is a success.
 *
 * @tsplus fluent ets/Managed isSuccess
 */
export function isSuccess<R, E, A>(self: Managed<R, E, A>, __tsplusTrace?: string) {
  return self.fold(constFalse, constTrue)
}
