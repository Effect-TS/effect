/**
 * Returns the specified stream if the given condition is satisfied, otherwise
 * returns an empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops when
 */
export function when<R, E, A>(
  b: LazyArg<boolean>,
  stream: LazyArg<Stream<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.whenEffect(Effect.succeed(b), stream)
}
