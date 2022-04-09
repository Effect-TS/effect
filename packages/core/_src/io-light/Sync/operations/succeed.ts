/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/Sync/Ops succeed
 */
export function succeed<A>(a: LazyArg<A>): Sync<unknown, never, A> {
  return XPure.succeed(a);
}
