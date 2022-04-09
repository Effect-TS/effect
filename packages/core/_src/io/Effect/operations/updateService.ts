/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Effect updateService
 */
export function updateService_<R, E, A, T>(self: Effect<R, E, A>, service: Service<T>) {
  return (f: (_: T) => T, __tsplusTrace?: string): Effect<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...service(f(service.get(r))) }));
}

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static ets/Effect/Aspects updateService
 */
export function updateService<T>(service: Service<T>, f: (_: T) => T, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & Has<T>, E, A> => self.updateService(service)(f);
}
