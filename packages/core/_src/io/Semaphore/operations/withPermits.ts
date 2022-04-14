import { concreteSemaphore } from "@effect/core/io/Semaphore/operations/_internal/SemaphoreInternal";

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @tsplus fluent ets/Semaphore withPermits
 */
export function withPermits_(self: Semaphore, permits: number, __tsplusTrace?: string) {
  return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> => {
    concreteSemaphore(self);
    return self.semaphore.withPermits(permits)(effect);
  };
}

/**
 * Executes the specified effect, acquiring the specified number of permits
 * immediately before the effect begins execution and releasing them
 * immediately after the effect completes execution, whether by success,
 * failure, or interruption.
 *
 * @tsplus static ets/Semaphore/Aspects withPermits
 */
export const withPermits = Pipeable(withPermits_);
