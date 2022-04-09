/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Sync updateService
 */
export function updateService_<R, E, A, T>(self: Sync<R, E, A>, service: Service<T>) {
  return (f: (resource: T) => T, __tsplusTrace?: string): Sync<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...service(f(service.get(r))) }));
}

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static ets/Sync/Aspects updateService
 */
export const updateService = Pipeable(updateService_);
