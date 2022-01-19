import type { Layer } from "../definition"
import { catchAll_ } from "./catchAll"

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 */
export function orElse_<R, E, A, R1, E1, A1>(
  self: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A | A1> {
  return catchAll_(self, () => that)
}

/**
 * Executes this layer and returns its output, if it succeeds, but otherwise
 * executes the specified layer.
 *
 * @ets_data_first orElse_
 */
export function orElse<R1, E1, A1>(that: Layer<R1, E1, A1>) {
  return <R, E, A>(self: Layer<R, E, A>): Layer<R & R1, E | E1, A | A1> =>
    orElse_(self, that)
}
