import { STMOnRetry } from "@effect/core/stm/STM/definition/primitives"

/**
 * Tries this effect first, and if it enters retry, then it tries the other
 * effect. This is an equivalent of haskell's orElse.
 *
 * @tsplus static effect/core/stm/STM.Aspects orTry
 * @tsplus pipeable effect/core/stm/STM orTry
 */
export function orTry<R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, A | A1> => new STMOnRetry(self, that)
}
