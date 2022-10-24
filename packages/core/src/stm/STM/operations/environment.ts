import { STMEffect } from "@effect/core/stm/STM/definition/primitives"
import type { Context } from "@fp-ts/data/Context"

/**
 * Retrieves the environment inside an `STM`.
 *
 * @tsplus static effect/core/stm/STM.Ops environment
 * @category environment
 * @since 1.0.0
 */
export function environment<R>(): STM<R, never, Context<R>> {
  return new STMEffect((_, __, env: Context<R>) => env)
}
