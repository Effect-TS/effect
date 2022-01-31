import type { List } from "../definition"
import { affixPush, reverseArray } from "./_internal/array"
import { getPrefixSize, incrementPrefix, setPrefix } from "./_internal/bits"
import { cloneList, ListInternal } from "./_internal/ListInternal"
import { prependNodeToTree } from "./_internal/node"

/**
 * Prepends an element to the front of a list and returns the new list.
 *
 * @complexity O(1)
 * @tsplus fluent ets/List prepend
 */
export function prepend_<A>(self: List<A>, value: A): List<A> {
  const prefixSize = getPrefixSize(self)
  if (prefixSize < 32) {
    return new ListInternal<A>(
      incrementPrefix(self.bits),
      self.offset,
      self.length + 1,
      affixPush(value, self.prefix, prefixSize),
      self.root,
      self.suffix
    )
  } else {
    const newList = cloneList(self)
    prependNodeToTree(newList, reverseArray(self.prefix))
    const newPrefix = [value]
    newList.prefix = newPrefix
    newList.length++
    newList.bits = setPrefix(1, newList.bits)
    return newList
  }
}

/**
 * Prepends an element to the front of a list and returns the new list.
 *
 * @complexity O(1)
 * @ets_data_first prepend_
 */
export function prepend<A>(value: A) {
  return (self: List<A>): List<A> => self.prepend(value)
}
