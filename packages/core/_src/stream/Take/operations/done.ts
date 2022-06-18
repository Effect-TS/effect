import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * Transforms `Take<E, A>` to an `Effect<never, Maybe<E>, Chunk<A>>`.
 *
 * @tsplus fluent ets/Take done
 */
export function done<E, A>(
  self: Take<E, A>,
  __tsplusTrace?: string
): Effect.IO<Maybe<E>, Chunk<A>> {
  concreteTake(self)
  return Effect.done(self._exit)
}
