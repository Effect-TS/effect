import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"

/**
 * @tsplus getter effect/core/stream/Take exit
 */
export function exit<E, A>(self: Take<E, A>): Exit<Maybe<E>, Chunk<A>> {
  concreteTake(self)
  return self._exit
}
