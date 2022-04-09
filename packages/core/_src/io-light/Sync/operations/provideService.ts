/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Sync provideService
 */
export function provideService_<R, E, A, T>(self: Sync<R & Has<T>, E, A>, service: Service<T>) {
  return (resource: LazyArg<T>, __tsplusTrace?: string): Sync<Erase<R & Has<T>, Has<T>>, E, A> =>
    self.provideServiceSync(service)(Sync.succeed(resource));
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Sync/Aspects provideService
 */
export const provideService = Pipeable(provideService_);
