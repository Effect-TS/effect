/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus fluent ets/Stream updateService
 */
export function updateService_<R, E, A, T>(self: Stream<R, E, A>, tag: Tag<T>) {
  return (f: (service: T) => T, __tsplusTrace?: string): Stream<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((env) => env.add(tag, f(env.get(tag))));
}

/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus static ets/Stream/Aspects updateService
 */
export const updateService = Pipeable(updateService_);
