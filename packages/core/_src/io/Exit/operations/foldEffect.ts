/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus fluent ets/Exit foldEffect
 */
export function foldEffect_<E, A, R1, E1, A1, R2, E2, A2>(
  self: Exit<E, A>,
  failed: (cause: Cause<E>) => Effect<R1, E1, A1>,
  completed: (a: A) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R1 | R2, E1 | E2, A1 | A2> {
  switch (self._tag) {
    case "Failure":
      return failed(self.cause)
    case "Success":
      return completed(self.value)
  }
}

/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus static ets/Exit/Aspects foldEffect
 */
export const foldEffect = Pipeable(foldEffect_)
