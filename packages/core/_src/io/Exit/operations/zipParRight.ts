/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus fluent ets/Exit zipParRight
 */
export function zipParRight_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, B> {
  return self.zipWith(that, (_, b) => b, Cause.both);
}

/**
 * Parallelly zips the this result with the specified result discarding the
 * first element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus static ets/Exit/Aspects zipParRight
 */
export const zipParRight = Pipeable(zipParRight_);
