import { commit } from "../../stm/STM/core"
import type { TSemaphore } from "../../stm/TSemaphore"
import { make as makeTSemaphore } from "../../stm/TSemaphore/operations/make"
import type { UIO } from "../Effect"

export * from "../../stm/TSemaphore/operations/acquire"
export * from "../../stm/TSemaphore/operations/acquireN"
export * from "../../stm/TSemaphore/operations/available"
export * from "../../stm/TSemaphore/operations/makeCommit"
export * from "../../stm/TSemaphore/operations/release"
export * from "../../stm/TSemaphore/operations/releaseN"
export * from "../../stm/TSemaphore/operations/withPermit"
export * from "../../stm/TSemaphore/operations/withPermitManaged"
export * from "../../stm/TSemaphore/operations/withPermits"
export * from "../../stm/TSemaphore/operations/withPermitsManaged"

export type Semaphore = TSemaphore

/**
 * Creates a new `Semaphore` with the specified number of permits.
 */
export function make(permits: number, __trace?: string): UIO<Semaphore> {
  return commit(makeTSemaphore(permits))
}
