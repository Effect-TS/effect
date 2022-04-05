import type { TSemaphore } from "@effect-ts/core/stm/TSemaphore/definition";
import { TSemaphoreSym } from "@effect-ts/core/stm/TSemaphore/definition";

export class TSemaphoreInternal implements TSemaphore {
  readonly [TSemaphoreSym]: TSemaphoreSym = TSemaphoreSym;
  constructor(readonly permits: TRef<number>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTSemaphore(_: TSemaphore): asserts _ is TSemaphoreInternal {
  //
}
