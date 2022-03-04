import type { FiberId } from "../../../io/FiberId"
import type { STM } from "../definition"
import { STMEffect } from "../definition"
import type { Journal } from "../Journal"

/**
 * @tsplus static ets/STMOps Effect
 */
export function effect<R, A>(
  f: (journal: Journal, fiberId: FiberId, environment: R) => A
): STM<R, never, A> {
  return new STMEffect(f)
}
