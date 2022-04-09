/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus fluent ets/Stream updateService
 */
export function updateService_<R, E, A, T>(self: Stream<R, E, A>, service: Service<T>) {
  return (f: (resource: T) => T, __tsplusTrace?: string): Stream<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((r) => ({ ...r, ...service(f(service.get(r))) }));
}

/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus static ets/Stream/Aspects updateService
 */
export const updateService = Pipeable(updateService_);
