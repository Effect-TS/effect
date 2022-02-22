import type { LazyArg } from "../../../../data/Function"
import type { List } from "../definition"

/**
 * Fold over a `List` by breaking it into its initial elements and it's last
 * element.
 *
 * @tsplus fluent ets/List foldRight
 */
export function foldRight_<A, B>(
  self: List<A>,
  onNil: LazyArg<B>,
  onCons: (init: List<A>, last: A) => B
): B {
  return self.isEmpty()
    ? onNil()
    : onCons(self.slice(0, self.length - 1), self.last.value!)
}

/**
 * Fold over a `List` by breaking it into its initial elements and it's last
 * element.
 *
 * @ets_data_first foldRight_
 */
export function foldRight<A, B>(
  onNil: LazyArg<B>,
  onCons: (init: List<A>, last: A) => B
) {
  return (self: List<A>): B => self.foldRight(onNil, onCons)
}
