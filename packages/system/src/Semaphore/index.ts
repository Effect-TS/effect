// ets_tracing: off

import type { UIO } from "../Effect/index.js"
import { commit } from "../Transactional/STM/core.js"
import type { TSemaphore } from "../Transactional/TSemaphore/index.js"
import { make as makeTSemaphore } from "../Transactional/TSemaphore/operations/make.js"

export * from "../Transactional/TSemaphore/operations/acquire.js"
export * from "../Transactional/TSemaphore/operations/acquireN.js"
export * from "../Transactional/TSemaphore/operations/available.js"
export * from "../Transactional/TSemaphore/operations/makeCommit.js"
export * from "../Transactional/TSemaphore/operations/release.js"
export * from "../Transactional/TSemaphore/operations/releaseN.js"
export * from "../Transactional/TSemaphore/operations/withPermit.js"
export * from "../Transactional/TSemaphore/operations/withPermitManaged.js"
export * from "../Transactional/TSemaphore/operations/withPermits.js"
export * from "../Transactional/TSemaphore/operations/withPermitsManaged.js"

export type Semaphore = TSemaphore

/**
 * Creates a new `Semaphore` with the specified number of permits.
 */
export function make(permits: number, __trace?: string): UIO<Semaphore> {
  return commit(makeTSemaphore(permits))
}
