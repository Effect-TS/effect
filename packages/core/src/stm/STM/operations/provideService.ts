import * as Context from "@fp-ts/data/Context"

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/stm/STM.Aspects provideService
 * @tsplus pipeable effect/core/stm/STM provideService
 * @category environment
 * @since 1.0.0
 */
export function provideService<T, T1 extends T>(tag: Context.Tag<T>, service: T1) {
  return <R, E, A>(self: STM<R, E, A>): STM<Exclude<R, T>, E, A> =>
    // @ts-expect-error
    self.provideSomeEnvironment(Context.add(tag)(service))
}
