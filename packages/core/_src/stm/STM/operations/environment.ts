import { STMEffect } from "@effect-ts/core/stm/STM/definition/primitives";

/**
 * Retrieves the environment inside an `STM`.
 *
 * @tsplus static ets/STM/Ops environment
 */
export function environment<R>(): STM<R, never, R> {
  return new STMEffect((_, __, r: R) => r);
}
