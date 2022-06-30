/**
 * Threads the stream through the transformation function `f`.
 *
 * @tsplus pipeable-operator effect/core/stream/Stream >>
 * @tsplus static effect/core/stream/Stream via
 * @tsplus pipeable effect/core/stream/Stream via
 */
export function via<R, E, A, R1, E1, A1>(
  f: (a: Stream<R, E, A>) => Stream<R1, E1, A1>,
  __tsplusTrace?: string
) {
  return (self: Stream<R, E, A>): Stream<R1, E1, A1> => Stream.suspend(f(self))
}
