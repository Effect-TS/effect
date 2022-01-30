import { Option } from "../../../../data/Option"
import type { List } from "../definition"
import { getPrefixSize } from "./_internal/bits"

/**
 * Returns the first element of the list. If the list is empty the
 * function returns undefined.
 *
 * @complexity O(1)
 * @ets getter ets/List first
 */
export function first<A>(self: List<A>): Option<A> {
  const prefixSize = getPrefixSize(self)
  return prefixSize !== 0
    ? Option.some(self.prefix[prefixSize - 1]!)
    : self.length !== 0
    ? Option.some(self.suffix[0]!)
    : Option.none
}
