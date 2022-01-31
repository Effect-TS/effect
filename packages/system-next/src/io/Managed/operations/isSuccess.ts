import { constFalse, constTrue } from "../../../data/Function"
import type { Managed } from "../definition"

/**
 * Returns whether this managed effect is a success.
 *
 * @ets fluent ets/Managed isSuccess
 */
export function isSuccess<R, E, A>(self: Managed<R, E, A>, __etsTrace?: string) {
  return self.fold(constFalse, constTrue)
}
