/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @tsplus fluent ets/Stream tap
 */
export function tap_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  return self.mapEffect((a) => f(a).as(a))
}

/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @tsplus static ets/Stream/Aspects tap
 */
export const tap = Pipeable(tap_)
