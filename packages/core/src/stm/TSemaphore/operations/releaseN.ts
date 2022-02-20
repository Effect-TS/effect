import { IllegalArgumentException } from "../../../io/Cause/errors"
import type { STM } from "../../STM"
import { STMEffect } from "../../STM/core"
import * as TRef from "../../TRef"
import type { TSemaphore } from "../definition"

/**
 * Releases the specified number of permits in a transactional context
 */
export function releaseN_(self: TSemaphore, n: number): STM<unknown, never, void> {
  return new STMEffect((journal) => {
    if (n < 0) {
      throw new IllegalArgumentException(
        `Unexpected negative value ${n} passed to releaseN`
      )
    }

    const current = TRef.unsafeGet_(self.permits, journal)

    return TRef.unsafeSet_(self.permits, current + n, journal)
  })
}

/**
 * Releases the specified number of permits in a transactional context
 *
 * @ets_data_first releaseN_
 */
export function releaseN(n: number) {
  return (self: TSemaphore): STM<unknown, never, void> => releaseN_(self, n)
}
