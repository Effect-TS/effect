/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/STM updateService
 */
export function updateService_<R, E, A, T>(self: STM<R, E, A>, service: Service<T>) {
  return (f: (_: T) => T): STM<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...service(f(service.get(r))) }));
}

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static ets/STM/Aspects updateService
 */
export const updateService = Pipeable(updateService_);
