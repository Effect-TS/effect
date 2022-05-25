/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @tsplus fluent ets/Effect flipWith
 */
export function flipWith_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (self: Effect<R, A, E>) => Effect<R2, A2, E2>,
  __tsplusTrace?: string
): Effect<R2, E2, A2> {
  return f(self.flip()).flip()
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the
 * parameters back
 *
 * @tsplus static ets/Effect/Aspects flipWith
 */
export const flipWith = Pipeable(flipWith_)
