import type { List } from "../definition"
import { foldlPrefix, foldlSuffix } from "./_internal/array"
import { getDepth, getPrefixSize, getSuffixSize } from "./_internal/bits"
import { foldlNode } from "./_internal/node"

/**
 * Folds a function over a list. Left-associative.
 *
 * @ets fluent ets/List reduce
 */
export function reduce_<A, B>(
  self: List<A>,
  initial: B,
  f: (acc: B, value: A) => B
): B {
  const suffixSize = getSuffixSize(self)
  const prefixSize = getPrefixSize(self)
  initial = foldlPrefix(f, initial, self.prefix, prefixSize)
  if (self.root !== undefined) {
    initial = foldlNode(f, initial, self.root, getDepth(self))
  }
  return foldlSuffix(f, initial, self.suffix, suffixSize)
}

/**
 * Folds a function over a list. Left-associative.
 *
 * @ets_data_first reduce_
 */
export function reduce<A, B>(initial: B, f: (acc: B, value: A) => B) {
  return (self: List<A>): B => self.reduce(initial, f)
}
