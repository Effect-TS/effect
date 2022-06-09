/**
 * Accesses the specified service in the environment of the stream in the
 * context of an effect.
 *
 * @tsplus static ets/Stream/Ops serviceWithEffect
 */
export function serviceWithEffect<T, R, E, A>(
  tag: Tag<T>,
  f: (resource: T) => Effect<R, E, A>,
  __tsplusTrace?: string
): Stream<R | T, E, A> {
  return Stream.fromEffect(Effect.serviceWithEffect(tag, f))
}
