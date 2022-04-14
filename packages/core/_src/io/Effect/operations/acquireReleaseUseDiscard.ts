/**
 * A less powerful variant of `acquireReleaseUse` where the resource acquired
 * by this effect is not needed.
 *
 * @tsplus static ets/Effect/Ops acquireReleaseUseDiscard
 */
export function acquireReleaseUseDiscard<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: LazyArg<Effect<R2, E2, A2>>,
  release: LazyArg<Effect.RIO<R3, X>>
): Effect<R & R2 & R3, E | E2, A2> {
  return Effect.acquireReleaseUse(acquire, use, release);
}
