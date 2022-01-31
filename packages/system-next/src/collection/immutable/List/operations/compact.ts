import { identity } from "../../../../data/Function"
import type { Option } from "../../../../data/Option"
import type { List } from "../definition"

/**
 * Filter out optional values.
 *
 * @tsplus fluent ets/List compact
 */
export function compact<A>(self: List<Option<A>>): List<A> {
  return self.collect(identity)
}
