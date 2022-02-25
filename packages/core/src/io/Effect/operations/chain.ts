import type { Effect } from "../definition"
import { IFlatMap } from "../definition"

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @tsplus fluent ets/Effect flatMap
 */
export function chain_<R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, B> {
  return new IFlatMap(self, f, __tsplusTrace)
}

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @ets_data_first chain_
 */
export function chain<A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, B> => self.flatMap(f)
}
