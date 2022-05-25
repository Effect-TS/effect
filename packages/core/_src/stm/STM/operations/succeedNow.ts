import { STMSucceedNow } from "@effect/core/stm/STM/definition/primitives"

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static ets/STM/Ops succeedNow
 */
export function succeedNow<A>(a: A): STM<unknown, never, A> {
  return new STMSucceedNow(a)
}
