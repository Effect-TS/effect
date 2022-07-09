/**
 * Retreives the `Clock` service from the environment and uses it to run the
 * specified effect.
 *
 * @tsplus static effect/core/io/Effect.Ops clockWith
 */
export function clockWith<R, E, A>(f: (clock: Clock) => Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> {
  return DefaultServices.currentServices.getWith((services) => f(services.get(Clock.Tag)))
}
