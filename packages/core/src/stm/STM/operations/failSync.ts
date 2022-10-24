import { STMEffect, STMFailException } from "@effect/core/stm/STM/definition/primitives"

/**
 * Returns a value that models failure in the transaction.
 *
 * @tsplus static effect/core/stm/STM.Ops failSync
 * @category constructors
 * @since 1.0.0
 */
export function failSync<E>(e: LazyArg<E>): STM<never, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e())
  })
}
