/**
 * Retreives the `Random` service from the environment and uses it to run the
 * specified workflow.
 *
 * @tsplus static ets/Effect/Ops randomWith
 */
export function randomWith<R, E, A>(f: (random: Random) => Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> {
  return DefaultEnv.services.value.getWith((services) => f(services.get(Random.Tag)))
}
