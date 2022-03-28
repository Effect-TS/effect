import type { Stream } from "../definition"

/**
 * Returns a stream whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 *
 * @tsplus fluent ets/Stream mapBoth
 */
export function mapBoth_<R, E, E2, A, A2>(
  self: Stream<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => A2,
  __tsplusTrace?: string
): Stream<R, E2, A2> {
  return self.mapError(f).map(g)
}

/**
 * Returns a stream whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 */
export const mapBoth = Pipeable(mapBoth_)
