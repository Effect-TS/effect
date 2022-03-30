import { TSemaphore } from "../../stm/TSemaphore"
import type { UIO } from "../Effect"

export * from "../../stm/TSemaphore/operations/acquire"
export * from "../../stm/TSemaphore/operations/acquireN"
export * from "../../stm/TSemaphore/operations/available"
export * from "../../stm/TSemaphore/operations/release"
export * from "../../stm/TSemaphore/operations/releaseN"
export * from "../../stm/TSemaphore/operations/withPermit"
export * from "../../stm/TSemaphore/operations/withPermits"
export * from "../../stm/TSemaphore/operations/withPermitScoped"
export * from "../../stm/TSemaphore/operations/withPermitsScoped"

/**
 * @tsplus type ets/Semaphore
 */
export type Semaphore = TSemaphore

/**
 * @tsplus type ets/SemaphoreOps
 */
export interface SemaphoreOps {}
export const Semaphore: SemaphoreOps = {}

/**
 * Creates a new `Semaphore` with the specified number of permits.
 *
 * @tsplus static ets/SemaphoreOps make
 */
export function make(permits: number, __tsplusTrace?: string): UIO<Semaphore> {
  return TSemaphore.make(permits).commit()
}
