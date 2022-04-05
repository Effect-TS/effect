/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/STM/Ops service
 */
export function service<T>(service: Service<T>): STM<Has<T>, never, T> {
  return STM.environmentWith((r) => service.get(r));
}
