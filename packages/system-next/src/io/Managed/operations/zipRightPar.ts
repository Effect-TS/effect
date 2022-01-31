import type { Managed } from "../definition"

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side.
 *
 * @ets fluent ets/Managed zipRightPar
 */
export function zipRightPar_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R2, E | E2, A2> {
  return self.zipWithPar(that, (_, a) => a)
}

/**
 * Parallelly zips this effect with the specified effect
 * returning the right side.
 *
 * @ets_data_first zipRightPar_
 */
export function zipRightPar<R2, E2, A2>(
  that: Managed<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>) => zipRightPar_(self, that)
}
