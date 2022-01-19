import type { Layer } from "../../Layer/definition"
import { environment as environmentLayer } from "../../Layer/operations/environment"
import type { Managed } from "../definition"
import { provideLayer_ } from "./provideLayer"

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function provideSomeLayer_<R1, E1, A1, R, E, A>(
  self: Managed<R1 & A, E1, A1>,
  layer: Layer<R, E, A>,
  __trace?: string
): Managed<R & R1, E | E1, A1> {
  return provideLayer_(self, layer["++"](environmentLayer()), __trace)
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeLayer_
 */
export function provideSomeLayer<R, E, A>(layer: Layer<R, E, A>, __trace?: string) {
  return <R1, E1, A1>(self: Managed<R1 & A, E1, A1>): Managed<R & R1, E | E1, A1> =>
    provideLayer_(self, layer["++"](environmentLayer()), __trace)
}
