// ets_tracing: off

import type { UIO } from "../Effect"
import { commit } from "../Transactional/STM/core"
import type { TSemaphore } from "../Transactional/TSemaphore"
import { make as makeTSemaphore } from "../Transactional/TSemaphore/operations/make"

// codegen:start {preset: barrel, include: ../Transactional/TSemaphore/operations/*.ts, exclude: ../Transactional/TSemaphore/operations/make.ts}
export * from "../Transactional/TSemaphore/operations/acquire"
export * from "../Transactional/TSemaphore/operations/acquireN"
export * from "../Transactional/TSemaphore/operations/available"
export * from "../Transactional/TSemaphore/operations/makeCommit"
export * from "../Transactional/TSemaphore/operations/release"
export * from "../Transactional/TSemaphore/operations/releaseN"
export * from "../Transactional/TSemaphore/operations/withPermit"
export * from "../Transactional/TSemaphore/operations/withPermitManaged"
export * from "../Transactional/TSemaphore/operations/withPermits"
export * from "../Transactional/TSemaphore/operations/withPermitsManaged"
// codegen:end

export type Semaphore = TSemaphore

/**
 * Creates a new `Semaphore` with the specified number of permits.
 */
export function make(permits: number, __trace?: string): UIO<Semaphore> {
  return commit(makeTSemaphore(permits))
}
