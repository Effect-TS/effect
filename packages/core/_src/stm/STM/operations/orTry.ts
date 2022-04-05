import { STMOnRetry } from "@effect-ts/core/stm/STM/definition/primitives";

/**
 * Tries this effect first, and if it enters retry, then it tries the other
 * effect. This is an equivalent of haskell's orElse.
 *
 * @tsplus fluent ets/STM orTry
 */
export function orTry<R, E, A, R1, E1, A1>(
  self: STM<R, E, A>,
  that: LazyArg<STM<R1, E1, A1>>
): STM<R & R1, E | E1, A | A1> {
  return new STMOnRetry(self, that);
}
