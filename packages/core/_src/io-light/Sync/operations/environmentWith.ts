/**
 * Access the environment with the specified function.
 *
 * @tsplus static ets/Sync/Ops environmentWith
 */
export function environmentWith<R, A>(f: (env: Env<R>) => A): Sync<R, never, A> {
  return XPure.environmentWith(f);
}
