import * as Context from "@fp-ts/data/Context"

/**
 * @tsplus static effect/core/stm/STM.Aspects provideServiceSTM
 * @tsplus pipeable effect/core/stm/STM provideServiceSTM
 * @category environment
 * @since 1.0.0
 */
export function provideServiceSTM<T, R1, E1, T1 extends T>(
  tag: Context.Tag<T>,
  service: STM<R1, E1, T1>
) {
  return <R, E, A>(self: STM<R, E, A>): STM<R1 | Exclude<R, T>, E | E1, A> =>
    service.flatMap((service) =>
      // @ts-expect-error
      self.provideSomeEnvironment(Context.add(tag)(service))
    )
}
