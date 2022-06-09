/**
 * Accesses the specified service in the environment of the stream.
 *
 * @tsplus static ets/Stream/Ops serviceWith
 */
export function serviceWith<T, A>(
  tag: Tag<T>,
  f: (resource: T) => A,
  __tsplusTrace?: string
): Stream<T, never, A> {
  return Stream.fromEffect(Effect.serviceWith(tag, f))
}
