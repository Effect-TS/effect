import { STM } from "../definition"

/**
 * Accesses the environment of the transaction.
 *
 * @tsplus static ets/STMOps environmentWith
 */
export function environmentWith<R, A>(f: (r: R) => A): STM<R, never, A> {
  return STM.environment<R>().map(f)
}
