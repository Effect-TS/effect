import type { List } from "../definition"
import type { EqualsState } from "./_internal/callbacks"
import { equalsCb, foldlCb } from "./_internal/callbacks"

/**
 * Returns true if the two lists are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 * @ets fluent ets/List equalsWith
 */
export function equalsWith_<A>(
  self: List<A>,
  that: List<A>,
  f: (a: A, b: A) => boolean
): boolean {
  if (self === that) {
    return true
  } else if (self.length !== that.length) {
    return false
  } else {
    const s = { iterator: that[Symbol.iterator](), equals: true, f }
    return foldlCb<A, EqualsState<A>>(equalsCb, s, self).equals
  }
}

/**
 * Returns true if the two lists are equivalent when comparing each
 * pair of elements with the given comparison function.
 *
 * @complexity O(n)
 * @ets_data_first equalsWith_
 */
export function equalsWith<A>(that: List<A>, f: (a: A, b: A) => boolean) {
  return (self: List<A>): boolean => self.equalsWith(that, f)
}
