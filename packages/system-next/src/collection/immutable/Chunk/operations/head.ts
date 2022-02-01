import type { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"

/**
 * Returns the first element of this chunk if it exists.
 *
 * @tsplus getter ets/Chunk head
 */
export function head<A>(self: Chunk<A>): Option<A> {
  return self.get(0)
}
