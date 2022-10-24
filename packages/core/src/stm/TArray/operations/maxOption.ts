import * as Order from "@fp-ts/core/typeclass/Order"
import type { Option } from "@fp-ts/data/Option"

/**
 * Atomically compute the greatest element in the array, if it exists.
 *
 * @tsplus static effect/core/stm/TArray.Aspects maxOption
 * @tsplus pipeable effect/core/stm/TArray maxOption
 * @category elements
 * @since 1.0.0
 */
export function maxOption<A>(order: Order.Order<A>) {
  const gt = Order.greaterThan(order)
  return (self: TArray<A>): STM<never, never, Option<A>> =>
    self.reduceOption((acc, a) => (gt(acc)(a) ? a : acc))
}
