import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Transforms `Take<E, A>` to an `Effect<never, Maybe<E>, Chunk<A>>`.
 *
 * @tsplus getter effect/core/stream/Take done
 */
export function done<E, A>(
  self: Take<E, A>,
  __tsplusTrace?: string
): Effect<never, Maybe<E>, Chunk<A>> {
  concreteTake(self)
  return Effect.done(self._exit)
}
