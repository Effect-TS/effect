/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops serviceWith
 */
export function serviceWith<T, A>(
  tag: Tag<T>,
  f: (resource: T) => A
): Stream<T, never, A> {
  return Stream.fromEffect(Effect.serviceWith(tag, f))
}
