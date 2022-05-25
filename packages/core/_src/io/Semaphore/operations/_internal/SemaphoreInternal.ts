import type { Semaphore } from "@effect/core/io/Semaphore/definition"
import { SemaphoreSym } from "@effect/core/io/Semaphore/definition"

export class SemaphoreInternal implements Semaphore {
  readonly [SemaphoreSym]: SemaphoreSym = SemaphoreSym
  constructor(readonly semaphore: TSemaphore) {}
}

/**
 * @tsplus macro remove
 */
export function concreteSemaphore(_: Semaphore): asserts _ is SemaphoreInternal {
  //
}
