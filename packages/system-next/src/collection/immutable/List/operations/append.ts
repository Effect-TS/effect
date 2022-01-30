import type { List } from "../definition"
import { affixPush } from "./_internal/array"
import { getSuffixSize, incrementSuffix, setSuffix } from "./_internal/bits"
import { cloneList, ListInternal } from "./_internal/ListInternal"
import { appendNodeToTree } from "./_internal/node"

/**
 * Appends an element to the end of a list and returns the new list.
 *
 * @complexity O(n)
 * @ets fluent ets/List append
 */
export function append_<A>(self: List<A>, value: A): List<A> {
  const suffixSize = getSuffixSize(self)
  if (suffixSize < 32) {
    return new ListInternal(
      incrementSuffix(self.bits),
      self.offset,
      self.length + 1,
      self.prefix,
      self.root,
      affixPush(value, self.suffix, suffixSize)
    )
  }
  const newSuffix = [value]
  const newList = cloneList(self)
  appendNodeToTree(newList, self.suffix)
  newList.suffix = newSuffix
  newList.length++
  newList.bits = setSuffix(1, newList.bits)
  return newList
}

/**
 * Appends an element to the end of a list and returns the new list.
 *
 * @complexity O(n)
 * @ets_data_first append_
 */
export function append<A>(value: A) {
  return (self: List<A>): List<A> => self.append(value)
}
