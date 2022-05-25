/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus operator ets/Exit >
 * @tsplus fluent ets/Exit zipRight
 */
export function zipRight_<E, A, E1, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, B> {
  return self.zipWith(that, (_, b) => b, Cause.then)
}

/**
 * Sequentially zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus static ets/Exit/Aspects zipRight
 */
export const zipRight = Pipeable(zipRight_)
