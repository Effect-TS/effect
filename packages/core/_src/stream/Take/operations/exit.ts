import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal";

/**
 * @tsplus fluent ets/Take exit
 */
export function exit<E, A>(self: Take<E, A>): Exit<Option<E>, Chunk<A>> {
  concreteTake(self);
  return self._exit;
}
