import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import { constFalse } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Checks if this `Take` is a failure.
 *
 * @tsplus getter effect/core/stream/Take isFailure
 * @category getters
 * @since 1.0.0
 */
export function isFailure<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold((cause) => Option.isSome(Cause.flipCauseOption(cause)), constFalse)
}
