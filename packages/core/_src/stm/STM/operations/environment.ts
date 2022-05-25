import { STMEffect } from "@effect/core/stm/STM/definition/primitives"

/**
 * Retrieves the environment inside an `STM`.
 *
 * @tsplus static ets/STM/Ops environment
 */
export function environment<R>(): STM<R, never, Env<R>> {
  return new STMEffect((_, __, env: Env<R>) => env)
}
