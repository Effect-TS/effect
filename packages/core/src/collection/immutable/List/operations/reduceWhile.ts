import type { List } from "../definition"
import type { FoldlWhileState } from "./_internal/callbacks"
import { foldlCb, foldlWhileCb } from "./_internal/callbacks"

/**
 * Perform the specified reduction function on a `List` while the specified
 * predicate holds true.
 *
 * @tsplus fluent ets/List reduceWhile
 */
export function reduceWhile_<A, B>(
  self: List<A>,
  initial: B,
  predicate: (acc: B, value: A) => boolean,
  f: (acc: B, value: A) => B
): B {
  return foldlCb<A, FoldlWhileState<A, B>>(
    foldlWhileCb,
    { predicate, f, result: initial },
    self
  ).result
}

/**
 * Perform the specified reduction function on a `List` while the specified
 * predicate holds true.
 *
 * @ets_data_first reduceWhile_
 */
export function reduceWhile<A, B>(
  initial: B,
  predicate: (acc: B, value: A) => boolean,
  f: (acc: B, value: A) => B
) {
  return (self: List<A>): B => self.reduceWhile(initial, predicate, f)
}
