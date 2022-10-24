import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import { constFalse } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Checks if this `take` is done (`Take.end`).
 *
 * @tsplus getter effect/core/stream/Take isDone
 * @category getters
 * @since 1.0.0
 */
export function isDone<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold((cause) => Option.isNone(Cause.flipCauseOption(cause)), constFalse)
}
