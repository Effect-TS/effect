import { IllegalArgumentException } from "../../../io/Cause/errors"
import type { STM } from "../../STM"
import { STMEffect, STMRetryException } from "../../STM"
import type { TSemaphore } from "../definition"

/**
 * Acquires the specified number of permits in a transactional context.
 *
 * @tsplus fluent ets/TSemaphore acquireN
 */
export function acquireN_(self: TSemaphore, n: number): STM<unknown, never, void> {
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

/**
 * Acquires the specified number of permits in a transactional context.
 *
 * @ets_data_first acquireN_
 */
export function acquireN(n: number) {
  return (self: TSemaphore): STM<unknown, never, void> => acquireN_(self, n)
}
