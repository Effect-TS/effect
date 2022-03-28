import { constFalse, constTrue } from "../../../data/Function"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * Checks if this `Take` is a success.
 *
 * @tsplus fluent ets/Take isSuccess
 */
export function isSuccess<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold(constFalse, constTrue)
}
