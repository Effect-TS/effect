import type { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the last element of this chunk if it exists.
 *
 * @tsplus getter ets/Chunk last
 */
export function last<A>(self: Chunk<A>): Option<A> {
  return self.get(concreteId(self).length - 1)
}
