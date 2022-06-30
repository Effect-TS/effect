/**
 * A less powerful variant of `acquireUseRelease` where the resource acquired
 * by this effect is not needed.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireUseReleaseDiscard
 * @tsplus fluent effect/core/io/Effect acquireUseReleaseDiscard
 */
export function acquireUseReleaseDiscard<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: LazyArg<Effect<R2, E2, A2>>,
  release: LazyArg<Effect<R3, never, X>>
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.acquireUseRelease(acquire, use, release)
}
