import { concreteTake } from "@effect-ts/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Checks if this `Take` is a failure.
 *
 * @tsplus fluent ets/Take isFailure
 */
export function isFailure<E, A>(self: Take<E, A>): boolean {
  concreteTake(self);
  return self._exit.fold((cause) => Cause.flipCauseOption(cause).isSome(), () => false);
}
