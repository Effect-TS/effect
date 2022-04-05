/**
 * Access the environment with the specified function.
 *
 * @tsplus static ets/Sync/Ops environmentWith
 */
export function environmentWith<R, A>(f: (_: R) => A): Sync<R, never, A> {
  return XPure.environmentWith(f);
}
