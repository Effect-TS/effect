import type { STM } from "../definition"
import { STMEffect } from "../definition"

/**
 * Retrieves the environment inside an `STM`.
 *
 * @tsplus static ets/STMOps environment
 */
export function environment<R>(): STM<R, never, R> {
  return new STMEffect((_, __, r: R) => r)
}
