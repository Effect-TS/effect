import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Checks if this `Take` is a success.
 *
 * @tsplus getter effect/core/stream/Take isSuccess
 * @category getters
 * @since 1.0.0
 */
export function isSuccess<E, A>(self: Take<E, A>): boolean {
  concreteTake(self)
  return self._exit.isSuccess()
}
