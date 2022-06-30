/**
 * @tsplus static effect/core/stm/STM.Aspects provideServiceSTM
 * @tsplus pipeable effect/core/stm/STM provideServiceSTM
 */
export function provideServiceSTM<T, R1, E1, T1 extends T>(
  tag: Tag<T>,
  service: LazyArg<STM<R1, E1, T1>>
) {
  return <R, E, A>(self: STM<R, E, A>): STM<R1 | Exclude<R, T>, E | E1, A> =>
    service().flatMap((service) =>
      self.provideSomeEnvironment((env: Env<Exclude<R, T>>) => env.add(tag, service) as Env<R>)
    )
}
