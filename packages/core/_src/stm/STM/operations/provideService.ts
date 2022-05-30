/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/STM provideService
 */
export function provideService_<R, E, A, T>(
  self: STM<R, E, A>,
  tag: Tag<T>,
  service: LazyArg<T>
): STM<Erase<R, Has<T>>, E, A> {
  return STM.succeed(service).flatMap((service) => self.provideSomeEnvironment((env: Env<R>) => env.add(tag, service)))
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/STM/Aspects provideService
 */
export const provideService = Pipeable(provideService_)
