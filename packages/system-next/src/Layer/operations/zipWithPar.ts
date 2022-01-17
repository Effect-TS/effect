// ets_tracing: off

import type { Layer } from "../definition"
import { ILayerZipWithPar } from "../definition"

/**
 * Combines this layer the specified layer, producing a new layer that has the
 * inputs of both, and the outputs of both combined using the specified
 * function.
 */
export function zipWithPar_<R, E, A, R1, E1, A1, A2>(
  self: Layer<R, E, A>,
  that: Layer<R1, E1, A1>,
  f: (a: A, b: A1) => A2
): Layer<R & R1, E | E1, A2> {
  return new ILayerZipWithPar(self, that, f)
}

/**
 * Combines this layer the specified layer, producing a new layer that has the
 * inputs of both, and the outputs of both combined using the specified
 * function.
 *
 * @ets_data_first zipWithPar_
 */
export function zipWithPar<A, R1, E1, A1, A2>(
  that: Layer<R1, E1, A1>,
  f: (a: A, b: A1) => A2
) {
  return <R, E>(self: Layer<R, E, A>): Layer<R & R1, E | E1, A2> =>
    zipWithPar_(self, that, f)
}
