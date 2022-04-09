/**
 * Suspend a computation, useful in recursion.
 *
 * @tsplus static ets/Sync/Ops suspend
 */
export function suspend<R, E, A>(f: LazyArg<Sync<R, E, A>>): Sync<R, E, A> {
  return XPure.suspend(f);
}
