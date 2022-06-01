import { STMSucceed } from "@effect/core/stm/STM/definition/primitives"

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static ets/STM/Ops succeed
 */
export function succeed<A>(a: LazyArg<A>): STM<never, never, A> {
  return new STMSucceed(a)
}
