/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @tsplus fluent ets/Effect onError
 */
export function onError_<R, E, A, R2, X>(
  self: Effect<R, E, A>,
  cleanup: (cause: Cause<E>) => Effect.RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R | R2, E, A> {
  return self.onExit(
    (exit): Effect.RIO<R2, X | void> => exit._tag === "Success" ? Effect.unit : cleanup(exit.cause)
  )
}

/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @tsplus static ets/Effect/Aspects onError
 */
export const onError = Pipeable(onError_)
