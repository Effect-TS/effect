import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/STM as
 */
export function as_<R, E, A, B>(self: STM<R, E, A>, b: LazyArg<B>): STM<R, E, B> {
  return self.map(b)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<A, B>(b: LazyArg<B>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> => self.as(b)
}
