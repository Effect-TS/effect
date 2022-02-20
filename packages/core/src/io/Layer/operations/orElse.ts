import type { Layer } from "../definition"

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @tsplus operator ets/Layer |
 * @tsplus fluent ets/Layer orElse
 */
export function orElse_<R, E, A, R1, E1, A1>(
  self: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A | A1> {
  return self.catchAll(() => that)
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @ets_data_first orElse_
 */
export function orElse<R1, E1, A1>(that: Layer<R1, E1, A1>) {
  return <R, E, A>(self: Layer<R, E, A>): Layer<R & R1, E | E1, A | A1> => self | that
}
