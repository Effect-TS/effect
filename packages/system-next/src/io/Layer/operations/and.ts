import type { Spreadable } from "../../../data/Utils"
import type { Layer } from "../definition"
import { ILayerZipWithPar } from "../definition"

/**
 * Combines this layer with the specified layer, producing a new layer that
 * has the inputs and outputs of both.
 *
 * @tsplus operator ets/Layer +
 * @tsplus fluent ets/Layer and
 */
export function and_<
  RIn,
  E,
  ROut extends Spreadable,
  RIn2,
  E2,
  ROut2 extends Spreadable
>(
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
export function and<RIn2, E2, ROut2 extends Spreadable>(that: Layer<RIn2, E2, ROut2>) {
  return <RIn, E, ROut extends Spreadable>(
    self: Layer<RIn, E, ROut>
  ): Layer<RIn & RIn2, E | E2, ROut & ROut2> => self + that
}
