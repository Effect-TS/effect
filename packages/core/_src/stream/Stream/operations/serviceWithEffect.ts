/**
 * Accesses the specified service in the environment of the stream in the
 * context of an effect.
 *
 * @tsplus static effect/core/stream/Stream.Ops serviceWithEffect
 */
export function serviceWithEffect<T, R, E, A>(
  tag: Tag<T>,
  f: (resource: T) => Effect<R, E, A>
): Stream<R | T, E, A> {
  return Stream.fromEffect(Effect.serviceWithEffect(tag, f))
}
