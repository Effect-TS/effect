/**
 * Threads the stream through the transformation function `f`.
 *
 * @tsplus operator ets/Stream >>
 * @tsplus fluent ets/Stream via
 */
export function via_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (a: Stream<R, E, A>) => Stream<R1, E1, A1>
): Stream<R1, E1, A1> {
  return Stream.suspend(f(self))
}

/**
 * Threads the stream through the transformation function `f`.
 *
 * @tsplus static ets/Stream/Aspects via
 */
export const via = Pipeable(via_)
