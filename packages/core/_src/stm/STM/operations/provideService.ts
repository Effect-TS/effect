/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/STM provideService
 */
export function provideService_<R, E, A, T>(self: STM<R & Has<T>, E, A>, tag: Tag<T>) {
  return (service: LazyArg<T>): STM<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    STM.succeed(service).flatMap((service) => self.provideEnvironment(Env().add(tag, service)));
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/STM/Aspects provideService
 */
export const provideService = Pipeable(provideService_);
