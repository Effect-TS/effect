/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus fluent ets/Stream updateService
 */
export function updateService_<R, E, A, T, T1 extends T>(
  self: Stream<R, E, A>,
  tag: Tag<T>,
  f: (service: T) => T1,
  __tsplusTrace?: string
): Stream<R | T, E, A> {
  return self.provideSomeEnvironment((env) => env.add(tag, f(env.unsafeGet(tag))))
}

/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus static ets/Stream/Aspects updateService
 */
export const updateService = Pipeable(updateService_)
