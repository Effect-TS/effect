/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus fluent ets/Exit zip
 */
export function zip_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b), Cause.then)
}

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus static ets/Exit/Aspects zip
 */
export const zip = Pipeable(zip_)
