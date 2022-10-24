import { TSemaphoreInternal } from "@effect/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal"

/**
 * Constructs a new `TSemaphore` with the specified number of permits.
 *
 * @tsplus static effect/core/stm/TSemaphore.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make(permits: number): STM<never, never, TSemaphore> {
  return TRef.make(permits).map((v) => new TSemaphoreInternal(v))
}
