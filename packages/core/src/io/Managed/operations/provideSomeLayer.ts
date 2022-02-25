import type { Erase } from "../../../data/Utils"
import type { Layer } from "../../Layer/definition"
import { environment as layerEnvironment } from "../../Layer/operations/environment"
import type { Managed } from "../definition"

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @tsplus fluent ets/Managed provideSomeLayer
 */
export function provideSomeLayer_<R1, E1, A1, R, E, A>(
  self: Managed<R1 & A, E1, A1>,
  layer: Layer<R, E, A>,
  __tsplusTrace?: string
): Managed<R & Erase<R1, A>, E | E1, A1> {
  // @ts-expect-error
  return self.provideLayer(layerEnvironment<R1>() + layer)
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeLayer_
 */
export function provideSomeLayer<R, E, A>(
  layer: Layer<R, E, A>,
  __tsplusTrace?: string
) {
  return <R1, E1, A1>(
    self: Managed<R1 & A, E1, A1>
  ): Managed<R & Erase<R1, A>, E | E1, A1> =>
    provideSomeLayer_<R1, E1, A1, R, E, A>(self, layer)
}
