import type { STM } from "../definition"
import { STMOnSuccess } from "../definition"

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @tsplus fluent ets/STM flatMap
 */
export function chain_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R, E | E1, B> {
  return new STMOnSuccess<R1 & R, E | E1, A, B>(self, f)
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @ets_data_first chain_
 */
export function chain<A, R1, E1, B>(
  f: (a: A) => STM<R1, E1, B>
): <R, E>(self: STM<R, E, A>) => STM<R1 & R, E | E1, B> {
  return (self) => self.flatMap(f)
}
