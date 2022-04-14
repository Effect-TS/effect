export * from "@effect/core/stm/TSemaphore/operations/acquire";
export * from "@effect/core/stm/TSemaphore/operations/acquireN";
export * from "@effect/core/stm/TSemaphore/operations/available";
export * from "@effect/core/stm/TSemaphore/operations/release";
export * from "@effect/core/stm/TSemaphore/operations/releaseN";
export * from "@effect/core/stm/TSemaphore/operations/withPermit";
export * from "@effect/core/stm/TSemaphore/operations/withPermits";
export * from "@effect/core/stm/TSemaphore/operations/withPermitScoped";
export * from "@effect/core/stm/TSemaphore/operations/withPermitsScoped";

/**
 * @tsplus type ets/Semaphore
 */
export type Semaphore = TSemaphore;

/**
 * @tsplus type ets/SemaphoreOps
 */
export interface SemaphoreOps {}
export const Semaphore: SemaphoreOps = {};

/**
 * Creates a new `Semaphore` with the specified number of permits.
 *
 * @tsplus static ets/SemaphoreOps make
 */
export function make(permits: number, __tsplusTrace?: string): Effect.UIO<Semaphore> {
  return TSemaphore.make(permits).commit();
}
