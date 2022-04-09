/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/Sync/Ops fail
 */
export function fail<E>(e: LazyArg<E>): Sync<unknown, E, never> {
  return XPure.fail(e);
}
