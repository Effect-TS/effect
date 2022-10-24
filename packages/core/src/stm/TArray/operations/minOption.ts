import * as Order from "@fp-ts/core/typeclass/Order"
import type { Option } from "@fp-ts/data/Option"

/**
 * Atomically compute the least element in the array, if it exists.
 *
 * @tsplus static effect/core/stm/TArray.Aspects minOption
 * @tsplus pipeable effect/core/stm/TArray minOption
 * @category elements
 * @since 1.0.0
 */
export function minOption<A>(sortable: Order.Order<A>) {
  const lt = Order.lessThan(sortable)
  return (self: TArray<A>): STM<never, never, Option<A>> =>
    self.reduceOption((acc, a) => (lt(acc)(a) ? a : acc))
}
