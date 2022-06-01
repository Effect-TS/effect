/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/STM updateService
 */
export function updateService_<R, E, A, T, T1 extends T>(
  self: STM<R, E, A>,
  tag: Tag<T>,
  f: (service: T) => T1
): STM<R | T, E, A> {
  return self.provideSomeEnvironment((env) => env.merge(Env(tag, f(env.unsafeGet(tag)))))
}

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static ets/STM/Aspects updateService
 */
export const updateService = Pipeable(updateService_)
