export const SemaphoreSym = Symbol.for("@effect/core/io/Semaphore");
export type SemaphoreSym = typeof SemaphoreSym;

/**
 * An asynchronous semaphore, which is a generalization of a mutex. Semaphores
 * have a certain number of permits, which can be held and released concurrently
 * by different parties. Attempts to acquire more permits than available result
 * in the acquiring fiber being suspended until the specified number of permits
 * become available.
 *
 * @tsplus type ets/Semaphore
 */
export interface Semaphore {
  readonly [SemaphoreSym]: SemaphoreSym;
}

/**
 * @tsplus type ets/Semaphore/Ops
 */
export interface SemaphoreOps {}
export const Semaphore: SemaphoreOps = {};

/**
 * @tsplus type ets/Semaphore/Aspects
 */
export interface SemaphoreAspects {}
