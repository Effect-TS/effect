/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/STM updateService
 */
export function updateService_<R, E, A, T>(self: STM<R, E, A>, tag: Tag<T>) {
  return (f: (service: T) => T): STM<R & Has<T>, E, A> =>
    self.provideSomeEnvironment((env) => env.merge(Env().add(tag, f(env.get(tag)))));
}

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static ets/STM/Aspects updateService
 */
export const updateService = Pipeable(updateService_);
