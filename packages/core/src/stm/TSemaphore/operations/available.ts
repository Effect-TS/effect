import { concreteTSemaphore } from "@effect/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal"

/**
 * Returns the number of available permits in a transactional context.
 *
 * @tsplus getter effect/core/stm/TSemaphore available
 * @category getters
 * @since 1.0.0
 */
export function available(self: TSemaphore): STM<never, never, number> {
  concreteTSemaphore(self)
  return self.permits.get
}
