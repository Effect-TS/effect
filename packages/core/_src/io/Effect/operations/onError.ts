/**
 * Runs the specified effect if this effect fails, providing the error to the
 * effect if it exists. The provided effect will not be interrupted.
 *
 * @tsplus static effect/core/io/Effect.Aspects onError
 * @tsplus pipeable effect/core/io/Effect onError
 */
export function onError<E, R2, X>(
  cleanup: (cause: Cause<E>) => Effect<R2, never, X>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E, A> =>
    self.onExit(
      (exit): Effect<R2, never, X | void> =>
        exit._tag === "Success" ?
          Effect.unit :
          cleanup(exit.cause)
    )
}
