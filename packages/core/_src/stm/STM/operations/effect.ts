import { STMEffect } from "@effect/core/stm/STM/definition/primitives";
import type { Journal } from "@effect/core/stm/STM/Journal";

/**
 * @tsplus static ets/STM/Ops Effect
 */
export function effect<R, A>(
  f: (journal: Journal, fiberId: FiberId, environment: R) => A
): STM<R, never, A> {
  return new STMEffect(f);
}
