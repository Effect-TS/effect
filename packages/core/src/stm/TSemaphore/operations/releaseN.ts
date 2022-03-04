import { IllegalArgumentException } from "../../../io/Cause/errors"
import { STM } from "../../STM"
import type { TSemaphore } from "../definition"

/**
 * Releases the specified number of permits in a transactional context
 *
 * @tsplus fluent ets/TSemaphore releaseN
 */
export function releaseN_(self: TSemaphore, n: number): STM<unknown, never, void> {
  return STM.Effect((journal) => {
    if (n < 0) {
      throw new IllegalArgumentException(
        `Unexpected negative value ${n} passed to releaseN`
      )
    }
    const current = self.permits.unsafeGet(journal)
    return self.permits.unsafeSet(current + n, journal)
  })
}

/**
 * Releases the specified number of permits in a transactional context
 *
 * @ets_data_first releaseN_
 */
export function releaseN(n: number) {
  return (self: TSemaphore): STM<unknown, never, void> => self.releaseN(n)
}
