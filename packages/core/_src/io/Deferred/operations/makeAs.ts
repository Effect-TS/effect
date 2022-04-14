/**
 * Makes a new `Deferred` to be completed by the fiber with the specified id.
 *
 * @tsplus static ets/Deferred/Ops makeAs
 */
export function makeAs<E, A>(
  fiberId: LazyArg<FiberId>,
  __tsplusTrace?: string
): Effect.UIO<Deferred<E, A>> {
  return Effect.succeed(Deferred.unsafeMake(fiberId()));
}
