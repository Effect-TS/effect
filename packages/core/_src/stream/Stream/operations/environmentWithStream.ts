/**
 * Accesses the environment of the stream in the context of a stream.
 *
 * @tsplus static ets/Stream/Ops environmentWithStream
 */
export function environmentWithStream<R0, R, E, A>(
  f: (r: R0) => Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R0 & R, E, A> {
  return Stream.environment<R0>().flatMap(f);
}
