import type { LazyArg } from "../../../../data/Function"
import type { List } from "../definition"

/**
 * Fold over a list by breaking it into its first element and it's remaining
 * elements.
 *
 * @tsplus fluent ets/List foldLeft
 */
export function foldLeft_<A, B>(
  self: List<A>,
  onNil: LazyArg<B>,
  onCons: (head: A, tail: List<A>) => B
): B {
  return self.isEmpty() ? onNil() : onCons(self.first.value!, self.tail())
}

/**
 * Fold over a list by breaking it into its first element and it's remaining
 * elements.
 *
 * @ets_data_first foldLeft_
 */
export function foldLeft<A, B>(
  onNil: LazyArg<B>,
  onCons: (head: A, tail: List<A>) => B
) {
  return (self: List<A>) => self.foldLeft(onNil, onCons)
}
