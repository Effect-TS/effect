import { constFalse } from "../../../data/Function"
import { Cause } from "../../../io/Cause"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * Checks if this `Take` is a failure.
 *
 * @tsplus fluent ets/Take isFailure
 */
export function isFailure<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold((cause) => Cause.flipCauseOption(cause).isSome(), constFalse)
}
