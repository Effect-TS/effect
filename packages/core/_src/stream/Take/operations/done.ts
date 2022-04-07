import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal";

/**
 * Transforms `Take<E, A>` to an `Effect<unknown, Option<E>, Chunk<A>>`.
 *
 * @tsplus fluent ets/Take done
 */
export function done<E, A>(
  self: Take<E, A>,
  __tsplusTrace?: string
): IO<Option<E>, Chunk<A>> {
  concreteTake(self);
  return Effect.done(self._exit);
}
