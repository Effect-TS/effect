// ets_tracing: off

import { IllegalArgumentException } from "../../../Cause/errors.js"
import type { STM } from "../../STM/index.js"
import { STMEffect, STMRetryException } from "../../STM/index.js"
import * as TRef from "../../TRef/index.js"
import type { TSemaphore } from "../definition.js"

/**
 * Acquires the specified number of permits in a transactional context.
 */
export function acquireN_(self: TSemaphore, n: number): STM<unknown, never, void> {
  return new STMEffect((journal) => {
    if (n < 0) {
      throw new IllegalArgumentException(
        `Unexpected negative value ${n} passed to acquireN`
      )
    }

    const value = TRef.unsafeGet_(self.permits, journal)

    if (value < n) {
      throw new STMRetryException()
    } else {
      return TRef.unsafeSet_(self.permits, value, journal)
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
