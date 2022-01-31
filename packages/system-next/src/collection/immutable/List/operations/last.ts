import { Option } from "../../../../data/Option"
import type { List } from "../definition"
import { getSuffixSize } from "./_internal/bits"

/**
 * Returns the last element of the list. If the list is empty the
 * function returns `undefined`.
 *
 * @complexity O(1)
 * @ets getter ets/List last
 */
export function last<A>(self: List<A>): Option<A> {
  const suffixSize = getSuffixSize(self)
  return suffixSize !== 0
    ? Option.some(self.suffix[suffixSize - 1]!)
    : self.length !== 0
    ? Option.some(self.prefix[0]!)
    : Option.none
}
