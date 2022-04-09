import { STMEffect, STMRetryException } from "@effect/core/stm/STM/definition/primitives";
import { concreteTSemaphore } from "@effect/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal";

/**
 * Acquires the specified number of permits in a transactional context.
 *
 * @tsplus fluent ets/TSemaphore acquireN
 */
export function acquireN_(self: TSemaphore, n: number): STM<unknown, never, void> {
  concreteTSemaphore(self);
  return new STMEffect((journal) => {
    if (n < 0) {
      throw new IllegalArgumentException(
        `Unexpected negative value ${n} passed to acquireN`
      );
    }
    const value = self.permits.unsafeGet(journal);
    if (value < n) {
      throw new STMRetryException();
    } else {
      return self.permits.unsafeSet(value - n, journal);
    }
  });
}

/**
 * Acquires the specified number of permits in a transactional context.
 *
 * @tsplus static ets/TSemaphore/Aspects acquireN
 */
export const acquireN = Pipeable(acquireN_);
