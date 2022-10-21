/**
 * Updates a service in the environment of this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects updateService
 * @tsplus pipeable effect/core/stream/Stream updateService
 */
export function updateService<T, T1 extends T>(
  tag: Tag<T>,
  f: (service: T) => T1
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | T, E, A> =>
    self.provideSomeEnvironment((env) => env.add(tag, f(env.unsafeGet(tag))))
}
