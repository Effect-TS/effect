import type { List } from "../definition"
import { foldrPrefix, foldrSuffix } from "./_internal/array"
import { getDepth, getPrefixSize, getSuffixSize } from "./_internal/bits"
import { foldrNode } from "./_internal/node"

/**
 * Folds a function over a list. Right-associative.
 *
 * @complexity O(n)
 * @ets fluent ets/List reduceRight
 */
export function reduceRight_<A, B>(
  self: List<A>,
  initial: B,
  f: (value: A, acc: B) => B
): B {
  const suffixSize = getSuffixSize(self)
  const prefixSize = getPrefixSize(self)
  let acc = foldrSuffix(f, initial, self.suffix, suffixSize)
  if (self.root !== undefined) {
    acc = foldrNode(f, acc, self.root, getDepth(self))
  }
  return foldrPrefix(f, acc, self.prefix, prefixSize)
}

/**
 * Folds a function over a list. Right-associative.
 *
 * @complexity O(n)
 * @ets_data_first reduceRight_
 */
export function reduceRight<A, B>(initial: B, f: (value: A, acc: B) => B) {
  return (self: List<A>): B => self.reduceRight(initial, f)
}
