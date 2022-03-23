import { constFalse } from "../../../data/Function"
import { Cause } from "../../../io/Cause"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * Checks if this `take` is done (`Take.end`).
 *
 * @tsplus fluent ets/Take isDone
 */
export function isDone<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold((cause) => Cause.flipCauseOption(cause).isNone(), constFalse)
}
