/**
 * Makes a new `Deferred` to be completed by the fiber with the specified id.
 *
 * @tsplus static effect/core/io/Deferred.Ops makeAs
 */
export function makeAs<E, A>(
  fiberId: FiberId
): Effect<never, never, Deferred<E, A>> {
  return Effect.sync(Deferred.unsafeMake(fiberId))
}
