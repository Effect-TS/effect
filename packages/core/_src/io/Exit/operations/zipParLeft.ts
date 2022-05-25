/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus fluent ets/Exit zipParLeft
 */
export function zipParLeft_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, A> {
  return self.zipWith(that, (a, _) => a, Cause.both)
}

/**
 * Parallelly zips the this result with the specified result discarding the
 * second element of the tuple or else returns the failed `Cause`.
 *
 * @tsplus static ets/Exit/Aspects zipParLeft
 */
export const zipParLeft = Pipeable(zipParLeft_)
