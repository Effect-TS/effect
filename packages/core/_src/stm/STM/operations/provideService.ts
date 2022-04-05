/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/STM provideService
 */
export function provideService_<R, E, A, T>(self: STM<R & Has<T>, E, A>, service: Service<T>) {
  return (resource: LazyArg<T>): STM<Erase<R, Has<T>>, E, A> =>
    // @ts-expect-error
    STM.environmentWith((r) => ({ ...r, ...service(resource()) }));
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/STM/Aspects provideService
 */
export const provideService = Pipeable(provideService_);
