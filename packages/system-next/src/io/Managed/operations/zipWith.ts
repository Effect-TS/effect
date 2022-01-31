import type { Managed } from "../definition"

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in sequence, combining their results with the specified `f` function.
 *
 * @ets fluent ets/Managed zipWith
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __etsTrace?: string
): Managed<R & R2, E | E2, B> {
  return self.flatMap((a) => that.map((a2) => f(a, a2)))
}

/**
 * Returns an effect that executes both this effect and the specified effect,
 * in sequence, combining their results with the specified `f` function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<R2, E2, A2, A, B>(
  that: Managed<R2, E2, A2>,
  f: (a: A, a2: A2) => B,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, B> =>
    zipWith_(self, that, f)
}
