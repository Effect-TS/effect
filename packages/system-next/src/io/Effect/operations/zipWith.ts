import type { Effect } from "../definition"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @ets fluent ets/Effect zipWith
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __etsTrace?: string
): Effect<R & R2, E | E2, B> {
  return self.flatMap((a) => that.map((b) => f(a, b)))
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, R2, E2, A2, B>(
  that: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __etsTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R2, E | E2, B> =>
    zipWith_(self, that, f)
}
