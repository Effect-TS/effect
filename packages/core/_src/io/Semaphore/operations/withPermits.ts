import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @tsplus static effect/core/io/Semaphore.Aspects withPermits
 * @tsplus pipeable effect/core/io/Semaphore withPermits
 */
export function withPermits(permits: number, __tsplusTrace?: string) {
  return (self: Semaphore): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A> => {
    return (effect) => {
      concreteSemaphore(self)
      return self.semaphore.withPermits(permits)(effect)
    }
  }
}
