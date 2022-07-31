/**
 * Updates the service with the required service entry.
 *
 * @tsplus static effect/core/io/Effect.Aspects updateService
 * @tsplus pipeable effect/core/io/Effect updateService
 */
export function updateService<T, T1 extends T>(
  tag: Tag<T>,
  f: (_: T) => T1
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | T, E, A> =>
    self.provideSomeEnvironment((env) => env.add(tag, f(env.unsafeGet(tag))))
}
