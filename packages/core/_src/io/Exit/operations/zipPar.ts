/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 *
 * @tsplus fluent ets/Exit zipPar
 */
export function zipPar_<E, E1, A, B>(
  self: Exit<E, A>,
  that: Exit<E1, B>
): Exit<E | E1, Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b), Cause.both);
}

/**
 * Parallelly zips the this result with the specified result or else returns
 * the failed `Cause`.
 *
 * @tsplus static ets/Exit/Aspects zipPar
 */
export const zipPar = Pipeable(zipPar_);
