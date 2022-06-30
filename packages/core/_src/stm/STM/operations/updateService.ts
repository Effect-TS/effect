/**
 * Updates the service with the required service entry.
 *
 * @tsplus static effect/core/stm/STM.Aspects updateService
 * @tsplus pipeable effect/core/stm/STM updateService
 */
export function updateService<T, T1 extends T>(tag: Tag<T>, f: (service: T) => T1) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | T, E, A> =>
    self.provideSomeEnvironment((env) => env.merge(Env(tag, f(env.unsafeGet(tag)))))
}
