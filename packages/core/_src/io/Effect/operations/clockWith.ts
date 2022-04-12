/**
 * Retreives the `Clock` service from the environment and uses it to run the
 * specified effect.
 *
 * @tsplus static ets/Effect/Ops clockWith
 */
export function clockWith<R, E, A>(f: (clock: Clock) => Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> {
  return DefaultEnv.services.value.getWith((services) => f(services.get(Clock.Tag)));
}
