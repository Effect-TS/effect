import type { LazyArg } from "../../../data/Function"
import type { Sync } from "../definition"

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/Sync as
 */
export function as_<R, E, A, B>(self: Sync<R, E, A>, value: LazyArg<B>): Sync<R, E, B> {
  return self.map(value)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<B>(value: LazyArg<B>) {
  return <R, E, A>(self: Sync<R, E, A>): Sync<R, E, B> => self.as(value)
}
