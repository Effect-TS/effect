/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus fluent ets/TSemaphore withPermitsScoped
 */
export function withPermitsScoped_(
  self: TSemaphore,
  permits: number,
  __tsplusTrace?: string
): Effect<HasScope, never, void> {
  return Effect.acquireReleaseInterruptible(
    self.acquireN(permits).commit(),
    self.releaseN(permits).commit()
  );
}

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus static ets/TSemaphore/Aspects withPermitsScoped
 */
export const withPermitsScoped = Pipeable(withPermitsScoped_);
