import type { LazyArg } from "../../../data/Function"
import type { Fiber } from "../definition"

/**
 * Maps the output of this fiber to the specified constant value.
 *
 * @tsplus fluent ets/Fiber as
 * @tsplus fluent ets/RuntimeFiber as
 */
export function as_<E, A, B>(self: Fiber<E, A>, b: LazyArg<B>): Fiber<E, B> {
  return self.map(b)
}

/**
 * Maps the output of this fiber to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<B>(b: LazyArg<B>) {
  return <E, A>(self: Fiber<E, A>): Fiber<E, B> => self.as(b)
}
