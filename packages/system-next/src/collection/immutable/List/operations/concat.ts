import type { List } from "../definition"
import {
  BranchBits,
  getDepth,
  getPrefixSize,
  getSuffixSize,
  Mask,
  setDepth,
  setSuffix
} from "./_internal/bits"
import { cloneList } from "./_internal/ListInternal"
import {
  appendNodeToTree,
  concatAffixes,
  concatBuffer,
  concatSubTree,
  getHeight,
  setSizes
} from "./_internal/node"

/**
 * Concatenates two lists.
 *
 * @complexity O(log(n))
 * @ets operator ets/List +
 * @ets fluent ets/List concat
 */
export function concat_<A>(self: List<A>, that: List<A>): List<A> {
  if (self.length === 0) {
    return that
  } else if (that.length === 0) {
    return self
  }
  const newSize = self.length + that.length
  const rightSuffixSize = getSuffixSize(that)
  let newList = cloneList(self)
  if (that.root === undefined) {
    // right is nothing but a prefix and a suffix
    const nrOfAffixes = concatAffixes(self, that)
    for (let i = 0; i < nrOfAffixes; ++i) {
      newList = appendNodeToTree(newList, concatBuffer[i])
      newList.length += concatBuffer[i].length
      // wipe pointer, otherwise it might end up keeping the array alive
      concatBuffer[i] = undefined
    }
    newList.length = newSize
    newList.suffix = concatBuffer[nrOfAffixes]
    newList.bits = setSuffix(concatBuffer[nrOfAffixes].length, newList.bits)
    concatBuffer[nrOfAffixes] = undefined
    return newList
  } else {
    const leftSuffixSize = getSuffixSize(self)
    if (leftSuffixSize > 0) {
      newList = appendNodeToTree(newList, self.suffix.slice(0, leftSuffixSize))
      newList.length += leftSuffixSize
    }
    newList = appendNodeToTree(
      newList,
      that.prefix.slice(0, getPrefixSize(that)).reverse()
    )
    const newNode = concatSubTree(
      newList.root!,
      getDepth(newList),
      that.root,
      getDepth(that),
      true
    )
    const newDepth = getHeight(newNode)
    setSizes(newNode, newDepth)
    newList.root = newNode
    newList.offset &= ~(Mask << (getDepth(self) * BranchBits))
    newList.length = newSize
    newList.bits = setSuffix(rightSuffixSize, setDepth(newDepth, newList.bits))
    newList.suffix = that.suffix
    return newList
  }
}

/**
 * Concatenates two lists.
 *
 * @complexity O(log(n))
 * @ets_data_first concat_
 */
export function concat<A>(that: List<A>) {
  return (self: List<A>): List<A> => self + that
}
