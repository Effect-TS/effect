/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/stm/STM.Aspects provideService
 * @tsplus pipeable effect/core/stm/STM provideService
 */
export function provideService<T, T1 extends T>(tag: Tag<T>, service: T1) {
  return <R, E, A>(self: STM<R, E, A>): STM<Exclude<R, T>, E, A> =>
    self.provideSomeEnvironment((env: Env<Exclude<R, T>>) => env.add(tag, service) as Env<R>)
}
