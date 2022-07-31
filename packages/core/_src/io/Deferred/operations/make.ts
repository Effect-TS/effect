/**
 * Makes a new `Deferred` to be completed by the fiber creating the `Deferred`.
 *
 * @tsplus static effect/core/io/Deferred.Ops make
 */
export function make<E, A>(): Effect<never, never, Deferred<E, A>> {
  return Effect.fiberId.flatMap((id) => Deferred.makeAs(id))
}
