/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @tsplus static effect/core/stm/TSemaphore.Aspects withPermits
 * @tsplus pipeable effect/core/stm/TSemaphore withPermits
 */
export function withPermits(permits: number, __tsplusTrace?: string) {
  return (self: TSemaphore): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    return (effect) =>
      Effect.uninterruptibleMask(
        ({ restore }) =>
          restore(self.acquireN(permits).commit) >
            restore(effect).ensuring(self.releaseN(permits).commit)
      )
  }
}
