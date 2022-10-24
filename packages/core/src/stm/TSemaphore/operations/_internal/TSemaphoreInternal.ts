import type { TSemaphore } from "@effect/core/stm/TSemaphore/definition"
import { TSemaphoreSym } from "@effect/core/stm/TSemaphore/definition"

/** @internal */
export class TSemaphoreInternal implements TSemaphore {
  readonly [TSemaphoreSym]: TSemaphoreSym = TSemaphoreSym
  constructor(readonly permits: TRef<number>) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTSemaphore(_: TSemaphore): asserts _ is TSemaphoreInternal {
  //
}
