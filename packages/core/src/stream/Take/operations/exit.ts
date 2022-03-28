import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Option } from "../../../data/Option"
import type { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { concreteTake } from "./_internal/TakeInternal"

/**
 * @tsplus fluent ets/Take exit
 */
export function exit<E, A>(self: Take<E, A>): Exit<Option<E>, Chunk<A>> {
  concreteTake(self)
  return self._exit
}
