/**
 * Provides the stream with the single service it requires. If the stream
 * requires multiple services use `provideEnvironment` instead.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideService
 * @tsplus static effect/core/stream/Stream provideService
 */
export function provideService<T, T1 extends T>(tag: Tag<T>, service: T1) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<Exclude<R, T>, E, A> =>
    Stream.environmentWithStream((env: Env<Exclude<R, T>>) =>
      self.provideEnvironment(env.add(tag, service) as Env<R>)
    )
}
