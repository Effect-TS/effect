import type { List } from "../definition"
import { copyArray } from "./_internal/array"
import { getDepth, getPrefixSize, getSuffixSize } from "./_internal/bits"
import { cloneList } from "./_internal/ListInternal"
import { updateNode } from "./_internal/node"

/**
 * Returns a list that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given list is returned unchanged.
 *
 * @complexity O(log(n))
 * @ets fluent ets/List update
 */
export function update_<A>(self: List<A>, index: number, a: A): List<A> {
  if (index < 0 || self.length <= index) {
    return self
  }
  const prefixSize = getPrefixSize(self)
  const suffixSize = getSuffixSize(self)
  const newList = cloneList(self)
  if (index < prefixSize) {
    const newPrefix = copyArray(newList.prefix)
    newPrefix[newPrefix.length - index - 1] = a
    newList.prefix = newPrefix
  } else if (index >= self.length - suffixSize) {
    const newSuffix = copyArray(newList.suffix)
    newSuffix[index - (self.length - suffixSize)] = a
    newList.suffix = newSuffix
  } else {
    newList.root = updateNode(
      self.root!,
      getDepth(self),
      index - prefixSize,
      self.offset,
      a
    )
  }
  return newList
}

/**
 * Returns a list that has the entry specified by the index replaced with the given value.
 *
 * If the index is out of bounds the given list is returned unchanged.
 *
 * @complexity O(log(n))
 * @ets_data_first update_
 */
export function update<A>(index: number, a: A) {
  return (self: List<A>): List<A> => self.update(index, a)
}
