import { Option } from "../../../../data/Option"
import type { List } from "../definition"
import { getDepth, getPrefixSize, getSuffixSize } from "./_internal/bits"
import { handleOffset, nodeNth, nodeNthDense } from "./_internal/node"

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 * @ets fluent ets/List nth
 */
export function nth_<A>(self: List<A>, index: number): Option<A> {
  if (index < 0 || self.length <= index) {
    return Option.none
  }
  const prefixSize = getPrefixSize(self)
  const suffixSize = getSuffixSize(self)
  if (index < prefixSize) {
    return Option.some(self.prefix[prefixSize - index - 1]!)
  } else if (index >= self.length - suffixSize) {
    return Option.some(self.suffix[index - (self.length - suffixSize)]!)
  }
  const { offset } = self
  const depth = getDepth(self)
  return Option.some(
    self.root!.sizes === undefined
      ? nodeNthDense(
          self.root!,
          depth,
          offset === 0
            ? index - prefixSize
            : handleOffset(depth, offset, index - prefixSize)
        )
      : nodeNth(self.root!, depth, offset, index - prefixSize)
  )
}

/**
 * Gets the nth element of the list. If `n` is out of bounds
 * `undefined` is returned.
 *
 * @complexity O(log(n))
 * @ets_data_first nth_
 */
export function nth(index: number) {
  return <A>(self: List<A>): Option<A> => self.nth(index)
}
