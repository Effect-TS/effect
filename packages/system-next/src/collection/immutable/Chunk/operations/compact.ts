import type { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"

/**
 * Filter out optional values
 *
 * @tsplus fluent ets/Chunk compact
 */
export function compact<A>(self: Chunk<Option<A>>): Chunk<A> {
  return self.collect((x: Option<A>) => x)
}
