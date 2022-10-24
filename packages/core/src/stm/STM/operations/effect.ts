import type { Journal } from "@effect/core/stm/STM/definition/primitives"
import { STMEffect } from "@effect/core/stm/STM/definition/primitives"
import type { Context } from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/stm/STM.Ops Effect
 * @category constructors
 * @since 1.0.0
 */
export function effect<R, A>(
  f: (journal: Journal, fiberId: FiberId, environment: Context<R>) => A
): STM<R, never, A> {
  return new STMEffect(f)
}
