import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Effect } from "../../../io/Effect"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * Returns an effect that effectfully "peeks" at the success of this take.
 *
 * @tsplus fluent ets/Take tap
 */
export function tap_<R, E, E1, A>(
  self: Take<E, A>,
  f: (chunk: Chunk<A>) => Effect<R, E1, any>
): Effect<R, E1, void> {
  concreteTake(self)
  return self._exit.forEach(f).asUnit()
}

/**
 * Returns an effect that effectfully "peeks" at the success of this take.
 */
export const tap = Pipeable(tap_)
