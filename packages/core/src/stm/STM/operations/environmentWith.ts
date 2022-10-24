import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the transaction.
 *
 * @tsplus static effect/core/stm/STM.Ops environmentWith
 * @category environment
 * @since 1.0.0
 */
export function environmentWith<R, A>(f: (context: Context<R>) => A): STM<R, never, A> {
  return STM.environment<R>().map(f)
}
