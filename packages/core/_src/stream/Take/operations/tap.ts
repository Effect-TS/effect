import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

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
  return self._exit.forEach(f).unit()
}

/**
 * Returns an effect that effectfully "peeks" at the success of this take.
 *
 * @tsplus static ets/Take/Aspects tap
 */
export const tap = Pipeable(tap_)
