import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus fluent ets/Effect zip
 */
export function zip_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
): Effect<R & R2, E | E2, Tuple<[A, A2]>> {
  return self.flatMap((a) => that().map((b) => Tuple(a, b)))
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets_data_first zip_
 */
export function zip<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, Tuple<[A, A2]>> =>
    self.zip(that)
}
