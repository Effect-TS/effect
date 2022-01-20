import type { Layer } from "../definition"
import { ILayerZipWithPar } from "../definition"

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs and outputs of both.
 */
export function and_<RIn, E, ROut, RIn2, E2, ROut2>(
  self: Layer<RIn, E, ROut>,
  that: Layer<RIn2, E2, ROut2>
): Layer<RIn & RIn2, E | E2, ROut & ROut2> {
  return new ILayerZipWithPar(self, that, (a, b) => ({ ...a, ...b }))
}

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs and outputs of both.
 *
 * @ets_data_first and_
 */
export function and<RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut>(
    self: Layer<RIn, E, ROut>
  ): Layer<RIn & RIn2, E | E2, ROut & ROut2> => and_(self, that)
}
