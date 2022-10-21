/**
 * Executes the release effect only if there was an error.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireUseReleaseOnError
 * @tsplus fluent effect/core/io/Effect acquireUseReleaseOnError
 */
export function acquireUseReleaseOnError<R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A) => Effect<R3, never, X>
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.acquireUseReleaseExit(
    acquire,
    use,
    (a, exit) => exit._tag === "Failure" ? release(a) : Effect.unit
  )
}
