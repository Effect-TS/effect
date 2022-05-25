import { SemaphoreInternal } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Creates a new `Semaphore` with the specified number of permits.
 *
 * @tsplus static ets/Semaphore/Ops make
 */
export function make(permits: number, __tsplusTrace?: string): Effect.UIO<Semaphore> {
  return TSemaphore.makeCommit(permits).map((semaphore) => new SemaphoreInternal(semaphore))
}
