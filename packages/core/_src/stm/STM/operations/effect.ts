import { STMEffect } from "@effect/core/stm/STM/definition/primitives"
import type { Journal } from "@effect/core/stm/STM/Journal"

/**
 * @tsplus static effect/core/stm/STM.Ops Effect
 */
export function effect<R, A>(
  f: (journal: Journal, fiberId: FiberId, environment: Env<R>) => A
): STM<R, never, A> {
  return new STMEffect(f)
}
