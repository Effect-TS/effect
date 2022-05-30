/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Effect provideService
 */
export function provideService_<R, E, A, T>(
  self: Effect<R, E, A>,
  tag: Tag<T>,
  resource: LazyArg<T>,
  __tsplusTrace?: string
): Effect<Erase<R, Has<T>>, E, A> {
  return self.provideServiceEffect(tag, Effect.succeed(resource))
}

/**
 * Provides the effect with the single service it requires. If the effect
 * requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Effect/Aspects provideService
 */
export const provideService = Pipeable(provideService_)
