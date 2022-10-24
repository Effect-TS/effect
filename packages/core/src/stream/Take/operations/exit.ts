import { concreteTake } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus getter effect/core/stream/Take exit
 * @category getters
 * @since 1.0.0
 */
export function exit<E, A>(self: Take<E, A>): Exit<Option<E>, Chunk<A>> {
  concreteTake(self)
  return self._exit
}
