/**
 * Creates a new `ScopedRef` from the specified value. This method should
 * not be used for values whose creation require the acquisition of resources.
 *
 * @tsplus static effect/core/io/ScopedRef.Ops make
 */
export function make<A>(value: LazyArg<A>): Effect<Scope, never, ScopedRef<A>> {
  return ScopedRef.fromAcquire(Effect.sync(value))
}
