/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Stream provideService
 */
export function provideService_<R, E, A, T>(
  self: Stream<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return (
    service: LazyArg<T>,
    __tsplusTrace?: string
  ): Stream<Erase<R & Has<T>, Has<T>>, E, A> =>
    Stream.succeed(service).flatMap((service) =>
      Stream.environmentWithStream((env: Env<R>) => self.provideEnvironment(env.add(tag, service)))
    )
}

/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus static ets/Stream/Aspects provideService
 */
export const provideService = Pipeable(provideService_)
