/**
 * Updates the service with the required service entry.
 *
 * @tsplus fluent ets/Effect updateService
 */
export function updateService_<R, E, A, T, T1 extends T>(
  self: Effect<R, E, A>,
  tag: Tag<T>,
  f: (_: T) => T1,
  __tsplusTrace?: string
): Effect<R | T, E, A> {
  return self.provideSomeEnvironment((env) => env.add(tag, f(env.unsafeGet(tag))))
}

/**
 * Updates the service with the required service entry.
 *
 * @tsplus static ets/Effect/Aspects updateService
 */
export const updateService = Pipeable(updateService_)
