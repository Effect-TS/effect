/**
 * @tsplus fluent ets/STM provideServiceSTM
 */
export function provideServiceSTM_<R, E, A, R1, E1, T, T1 extends T>(
  self: STM<R, E, A>,
  tag: Tag<T>,
  service: LazyArg<STM<R1, E1, T1>>
): STM<R1 | Exclude<R, T>, E | E1, A> {
  return service().flatMap((service) =>
    self.provideSomeEnvironment((env: Env<Exclude<R, T>>) => env.add(tag, service) as Env<R>)
  )
}

/**
 * @tsplus static ets/STM/Aspects provideServiceSTM
 */
export const provideServiceSTM = Pipeable(provideServiceSTM_)
