/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus static effect/core/stm/TSemaphore.Aspects withPermitsScoped
 * @tsplus pipeable effect/core/stm/TSemaphore withPermitsScoped
 */
export function withPermitsScoped(permits: number, __tsplusTrace?: string) {
  return (self: TSemaphore): Effect<Scope, never, void> =>
    Effect.acquireReleaseInterruptible(
      self.acquireN(permits).commit,
      self.releaseN(permits).commit
    )
}
