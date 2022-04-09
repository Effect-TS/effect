/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus fluent ets/Effect zipWith
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  f: (a: A, b: A2) => B,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, B> {
  return self.flatMap((a) => that().map((b) => f(a, b)));
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus static ets/Effect/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_);
