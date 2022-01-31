import type { Managed } from "../definition"

/**
 * Flip the error and result, then apply an effectful function to the effect.
 *
 * @ets fluent ets/Managed flipWith
 */
export function flipWith_<R, E, A, R2, E1, A1>(
  self: Managed<R, E, A>,
  f: (_: Managed<R, A, E>) => Managed<R2, A1, E1>,
  __etsTrace?: string
) {
  return f(self.flip()).flip()
}

/**
 * Flip the error and result, then apply an effectful function to the effect.
 *
 * @ets_data_first flipWith_
 */
export function flipWith<R, E, A, R2, E1, A1>(
  f: (_: Managed<R, A, E>) => Managed<R2, A1, E1>,
  __etsTrace?: string
) {
  return (self: Managed<R, E, A>) => flipWith_(self, f)
}
