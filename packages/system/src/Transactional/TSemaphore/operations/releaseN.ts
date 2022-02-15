// ets_tracing: off

import { IllegalArgumentException } from "../../../Cause/errors.js"
import type { STM } from "../../STM/index.js"
import { STMEffect } from "../../STM/index.js"
import * as TRef from "../../TRef/index.js"
import type { TSemaphore } from "../definition.js"

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
