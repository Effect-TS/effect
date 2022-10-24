/**
 * A less powerful variant of `acquireUseRelease` where the resource acquired
 * by this effect is not needed.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireUseReleaseDiscard
 * @tsplus fluent effect/core/io/Effect acquireUseReleaseDiscard
 * @category acquire/release
 * @since 1.0.0
 */
export function acquireUseReleaseDiscard<R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect<R, E, A>,
  use: Effect<R2, E2, A2>,
  release: Effect<R3, never, X>
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.acquireUseRelease(acquire, () => use, () => release)
}
