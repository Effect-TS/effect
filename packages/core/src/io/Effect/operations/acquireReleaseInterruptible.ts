/**
 * A variant of `acquireRelease` that allows the `acquire` effect to be
 * interruptible. Since the `acquire` effect could be interrupted after
 * partially acquiring resources, the `release` effect is not allowed to
 * access the resource produced by `acquire` and must independently determine
 * what finalization, if any, needs to be performed (e.g. by examining in
 * memory state).
 *
 * @tsplus static effect/core/io/Effect.Ops acquireReleaseInterruptible
 * @tsplus fluent effect/core/io/Effect acquireReleaseInterruptible
 * @category acquire/release
 * @since 1.0.0
 */
export function acquireReleaseInterruptible<R, E, A, R2, X>(
  acquire: Effect<R, E, A>,
  release: Effect<R2, never, X>
): Effect<R | R2 | Scope, E, A> {
  return Effect.acquireReleaseInterruptibleExit(acquire, () => release)
}
