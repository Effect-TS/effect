/**
 * Executes the release effect only if there was an error.
 *
 * @tsplus static ets/Effect/Ops acquireUseReleaseOnError
 * @tsplus fluent ets/Effect acquireUseReleaseOnError
 */
export function acquireUseReleaseOnError<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A) => Effect<R3, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.acquireUseReleaseExit(
    acquire,
    use,
    (a, exit): Effect.RIO<R3, void> => exit._tag === "Failure" ? release(a) : Effect.unit
  )
}
