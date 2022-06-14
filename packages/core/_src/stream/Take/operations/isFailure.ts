import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Checks if this `Take` is a failure.
 *
 * @tsplus getter ets/Take isFailure
 */
export function isFailure<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold((cause) => Cause.flipCauseOption(cause).isSome(), () => false)
}
