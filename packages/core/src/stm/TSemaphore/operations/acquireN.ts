import { STMEffect, STMRetryException } from "@effect/core/stm/STM/definition/primitives"
import { concreteTSemaphore } from "@effect/core/stm/TSemaphore/operations/_internal/TSemaphoreInternal"

/**
 * Acquires the specified number of permits in a transactional context.
 *
 * @tsplus static effect/core/stm/TSemaphore.Aspects acquireN
 * @tsplus pipeable effect/core/stm/TSemaphore acquireN
 * @category mutations
 * @since 1.0.0
 */
export function acquireN(n: number) {
  return (self: TSemaphore): STM<never, never, void> => {
    concreteTSemaphore(self)
    return new STMEffect((journal) => {
      if (n < 0) {
        throw new IllegalArgumentException(
          `Unexpected negative value ${n} passed to acquireN`
        )
      }
      const value = self.permits.unsafeGet(journal)
      if (value < n) {
        throw new STMRetryException()
      } else {
        return self.permits.unsafeSet(value - n, journal)
      }
    })
  }
}
