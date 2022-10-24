/**
 * Makes a new `TRef` that is initialized to the specified value.
 *
 * @tsplus static effect/core/stm/TRef.Ops makeCommit
 * @category constructors
 * @since 1.0.0
 */
export function makeCommit<A>(a: LazyArg<A>): Effect<never, never, TRef<A>> {
  return TRef.make(a).commit
}
