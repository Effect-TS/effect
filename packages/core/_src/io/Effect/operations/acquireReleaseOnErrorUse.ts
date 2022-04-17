/**
 * Executes the release effect only if there was an error.
 *
 * @tsplus static ets/Effect/Ops acquireReleaseOnErrorUse
 * @tsplus fluent ets/Effect acquireReleaseOnErrorUse
 */
export function acquireReleaseOnErrorWith<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A) => Effect.RIO<R3, X>,
  __tsplusTrace?: string
): Effect<R & R2 & R3, E | E2, A2> {
  return Effect.acquireReleaseExitUse(
    acquire,
    use,
    (a, exit): Effect.RIO<R3, void> => exit._tag === "Failure" ? release(a) : Effect.unit
  );
}
