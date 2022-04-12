/**
 * Accesses the specified service in the environment of the stream in the
 * context of an effect.
 *
 * @tsplus static ets/Stream/Ops serviceWithEffect
 */
export function serviceWithEffect<T>(tag: Tag<T>) {
  return <R, E, A>(
    f: (resource: T) => Effect<R, E, A>,
    __tsplusTrace?: string
  ): Stream<R & Has<T>, E, A> => Stream.fromEffect(Effect.serviceWithEffect(tag)(f));
}
