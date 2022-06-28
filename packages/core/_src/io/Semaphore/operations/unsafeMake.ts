import { SemaphoreInternal } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * @tsplus static ets/Semaphore/Ops unsafeMake
 */
export function unsafeMake(permits: number, __tsplusTrace?: string): Semaphore {
  return new SemaphoreInternal(TSemaphore.unsafeMake(permits))
}
