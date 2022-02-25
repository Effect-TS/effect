import type { Managed } from "../definition"

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side.
 *
 * @tsplus fluent ets/Managed zipLeft
 * @tsplus operator ets/Managed <
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, A> {
  return self.zipWith(that, (a) => a)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the left side.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R2, E2, A2>(that: Managed<R2, E2, A2>, __tsplusTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E | E2, A> =>
    zipLeft_(self, that)
}
