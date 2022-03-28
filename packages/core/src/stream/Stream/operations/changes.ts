import type { Stream } from "../definition"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using strict equality to determine whether two
 * elements are equal.
 *
 * @tsplus fluent ets/Stream changes
 */
export function changes<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.changesWith((x, y) => x === y)
}
