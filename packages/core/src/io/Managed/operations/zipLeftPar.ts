import type { Managed } from "../definition"

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side.
 *
 * @tsplus fluent ets/Managed zipLeftPar
 */
export function zipLeftPar_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, A> {
  return self.zipWithPar(that, (a) => a)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the left side.
 *
 * @ets_data_first zipLeftPar_
 */
export function zipLeftPar<R2, E2, A2>(
  that: Managed<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>) => zipLeftPar_(self, that)
}
