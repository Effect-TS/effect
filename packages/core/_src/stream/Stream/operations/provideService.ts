/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Stream provideService
 */
export function provideService_<R, E, A, T, T1 extends T>(
  self: Stream<R, E, A>,
  tag: Tag<T>,
  service: LazyArg<T1>,
  __tsplusTrace?: string
): Stream<Exclude<R, T>, E, A> {
  return Stream.succeed(service).flatMap((service) =>
    Stream.environmentWithStream((env: Env<Exclude<R, T>>) => self.provideEnvironment(env.add(tag, service) as Env<R>))
  )
}

/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus static ets/Stream/Aspects provideService
 */
export const provideService = Pipeable(provideService_)
