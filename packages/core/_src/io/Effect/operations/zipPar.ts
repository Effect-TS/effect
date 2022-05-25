/**
 * Zips this effect and that effect in parallel.
 *
 * @tsplus fluent ets/Effect zipPar
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, Tuple<[A, A2]>> {
  return self.zipWithPar(that, (a, b) => Tuple(a, b))
}

/**
 * Zips this effect and that effect in parallel.
 *
 * @tsplus static ets/Effect/Aspects zipPar
 */
export const zipPar = Pipeable(zipPar_)
