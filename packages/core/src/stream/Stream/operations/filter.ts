import type { Predicate, Refinement } from "../../../data/Function"
import type { Stream } from "../definition"

/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @tsplus fluent ets/Stream filter
 */
export function filter_<R, E, A, B extends A>(
  self: Stream<R, E, A>,
  f: Refinement<A, B>,
  __tsplusTrace?: string
): Stream<R, E, B>
export function filter_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A>
export function filter_<R, E, A>(
  self: Stream<R, E, A>,
  f: Predicate<A>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.mapChunks((chunk) => chunk.filter(f))
}

/**
 * Filters the elements emitted by this stream using the provided function.
 */
export const filter = Pipeable(filter_)
