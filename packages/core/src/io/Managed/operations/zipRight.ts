import type { Managed } from "../definition"

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side.
 *
 * @tsplus fluent ets/Managed zipRight
 * @tsplus operator ets/Managed >
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, A2> {
  return self.zipWith(that, (_, a) => a)
}

/**
 * Sequentially zips this effect with the specified effect
 * returning the right side.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R2, E2, A2>(
  that: Managed<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>) => zipRight_(self, that)
}
