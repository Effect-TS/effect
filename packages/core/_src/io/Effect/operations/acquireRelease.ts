/**
 * Constructs a scoped resource from an `acquire` and `release` workflow. If
 * `acquire` successfully completes execution then `release` will be added to
 * the finalizers associated with the scope of this workflow and is guaranteed
 * to be run when the scope is closed.
 *
 * The `acquire` and `release` workflows will be run uninterruptibly.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireRelease
 * @tsplus fluent effect/core/io/Effect acquireRelease
 */
export function acquireRelease<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A) => Effect<R2, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return Effect.acquireReleaseExit(acquire, (a, _) => release(a), __tsplusTrace)
}
