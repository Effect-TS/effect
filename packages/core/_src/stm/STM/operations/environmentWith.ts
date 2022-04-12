/**
 * Accesses the environment of the transaction.
 *
 * @tsplus static ets/STM/Ops environmentWith
 */
export function environmentWith<R, A>(f: (env: Env<R>) => A): STM<R, never, A> {
  return STM.environment<R>().map(f);
}
