import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal"

/**
 * Returns a scoped effect that describes acquiring the specified number of
 * permits and releasing them when the scope is closed.
 *
 * @tsplus static effect/core/io/Semaphore.Aspects withPermitsScoped
 * @tsplus pipeable effect/core/io/Semaphore withPermitsScoped
 */
export function withPermitsScoped(permits: number, __tsplusTrace?: string) {
  return (self: Semaphore): Effect<Scope, never, void> => {
    concreteSemaphore(self)
    return self.semaphore.withPermitsScoped(permits)
  }
}
