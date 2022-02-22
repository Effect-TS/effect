import type { MutableList } from "../definition"
import { Node } from "../definition"
import {
  BranchBits,
  BranchingFactor,
  getDepth,
  getSuffixSize,
  incrementDepth,
  incrementSuffix,
  Mask,
  setPrefix,
  setSuffix
} from "./_internal/bits"
import { createPath } from "./_internal/node"

/**
 * Appends the value to the list by _mutating_ the list and its content.
 *
 * @tsplus fluent ets/MutableList push
 */
export function push_<A>(self: MutableList<A>, value: A): MutableList<A> {
  const suffixSize = getSuffixSize(self)
  if (self.length === 0) {
    self.bits = setPrefix(1, self.bits)
    self.prefix = [value]
  } else if (suffixSize < 32) {
    self.bits = incrementSuffix(self.bits)
    self.suffix.push(value)
  } else if (self.root === undefined) {
    self.root = new Node(undefined, self.suffix)
    self.suffix = [value]
    self.bits = setSuffix(1, self.bits)
  } else {
    const newNode = new Node(undefined, self.suffix)
    const index = self.length - 1 - 32 + 1
    let current = self.root!
    let depth = getDepth(self)
    self.suffix = [value]
    self.bits = setSuffix(1, self.bits)
    if (index - 1 < BranchingFactor ** (depth + 1)) {
      for (; depth >= 0; --depth) {
        const path = (index >> (depth * BranchBits)) & Mask
        if (path < current.array.length) {
          current = current.array[path]
        } else {
          current.array.push(createPath(depth - 1, newNode))
          break
        }
      }
    } else {
      self.bits = incrementDepth(self.bits)
      self.root = new Node(undefined, [self.root, createPath(depth, newNode)])
    }
  }
  self.length++
  return self
}

/**
 * Appends the value to the list by _mutating_ the list and its content.
 *
 * @ets_data_first push_
 */
export function push<A>(value: A) {
  return (self: MutableList<A>): MutableList<A> => self.push(value)
}
