import { concreteTSemaphore } from "@effect-ts/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal";

/**
 * Returns the number of available permits in a transactional context.
 *
 * @tsplus fluent ets/TSemaphore available
 */
export function available(self: TSemaphore): STM<unknown, never, number> {
  concreteTSemaphore(self);
  return self.permits.get();
}
