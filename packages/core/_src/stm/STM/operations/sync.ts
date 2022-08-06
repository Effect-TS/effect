import { STMSucceed } from "@effect/core/stm/STM/definition/primitives"

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static effect/core/stm/STM.Ops sync
 */
export function sync<A>(a: LazyArg<A>): STM<never, never, A> {
  return new STMSucceed(a)
}
