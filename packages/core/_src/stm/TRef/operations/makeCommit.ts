/**
 * Makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static ets/TRef/Ops makeCommit
 */
export function makeCommit<A>(a: LazyArg<A>): UIO<TRef<A>> {
  return TRef.make(a).commit();
}
