/**
 * Makes a new `Deferred` to be completed by the fiber creating the `Deferred`.
 *
 * @tsplus static ets/Deferred/Ops make
 */
export function make<E, A>(__tsplusTrace?: string): UIO<Deferred<E, A>> {
  return Effect.fiberId.flatMap((id) => Deferred.makeAs(id));
}
