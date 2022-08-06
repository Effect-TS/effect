import { STMSucceedNow } from "@effect/core/stm/STM/definition/primitives"

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static effect/core/stm/STM.Ops succeed
 */
export function succeed<A>(a: A): STM<never, never, A> {
  return new STMSucceedNow(a)
}
