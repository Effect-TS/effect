import { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns every elements after the first.
 *
 * @tsplus getter ets/Chunk tail
 */
export function tail<A>(self: Chunk<A>): Option<Chunk<A>> {
  return concreteId(self).length > 0 ? Option.some(self.drop(1)) : Option.none
}
