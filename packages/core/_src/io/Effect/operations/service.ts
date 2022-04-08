/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/Effect/Ops service
 */
export function service<T>(
  service: Service<T>,
  __tsplusTrace?: string
): Effect<Has<T>, never, T> {
  return Effect.serviceWithEffect(service)(Effect.succeedNow);
}
