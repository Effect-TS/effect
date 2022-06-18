import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Checks if this `take` is done (`Take.end`).
 *
 * @tsplus getter ets/Take isDone
 */
export function isDone<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.fold((cause) => Cause.flipCauseMaybe(cause).isNone(), () => false)
}
