import type { List } from "../definition"
import { mapAffix, mapPrefix } from "./_internal/array"
import { getDepth, getPrefixSize, getSuffixSize } from "./_internal/bits"
import { ListInternal } from "./_internal/ListInternal"
import { mapNode } from "./_internal/node"

/**
 * Applies a function to each element in the given list and returns a
 * new list of the values that the function return.
 *
 * @complexity O(n)
 * @ets fluent ets/List map
 */
export function map_<A, B>(self: List<A>, f: (a: A) => B): List<B> {
  return new ListInternal(
    self.bits,
    self.offset,
    self.length,
    mapPrefix(f, self.prefix, getPrefixSize(self)),
    self.root === undefined ? undefined : mapNode(f, self.root, getDepth(self)),
    mapAffix(f, self.suffix, getSuffixSize(self))
  )
}

/**
 * Applies a function to each element in the given list and returns a
 * new list of the values that the function return.
 *
 * @complexity O(n)
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: List<A>): List<B> => self.map(f)
}
