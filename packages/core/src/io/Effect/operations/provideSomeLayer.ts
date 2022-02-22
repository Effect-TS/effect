import type { Erase } from "../../../data/Utils"
import type { Layer } from "../../Layer"
import { and_ as andLayer_ } from "../../Layer/operations/and"
import { environment as environmentLayer } from "../../Layer/operations/environment"
import type { Effect } from "../definition"

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @tsplus fluent ets/Effect provideSomeLayer
 */
export function provideSomeLayer_<R, E, A, R1, E1, A1>(
  self: Effect<R, E, A>,
  layer: Layer<R1, E1, A1>,
  __etsTrace?: string
): Effect<R1 & Erase<R, A1>, E | E1, A> {
  // @ts-expect-error
  return self.provideLayer(andLayer_(environmentLayer<R1>(), layer))
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeLayer_
 */
export function provideSomeLayer<R1, E1, A1>(
  layer: Layer<R1, E1, A1>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R & A1, E, A>): Effect<R1 & Erase<R, A1>, E | E1, A> =>
    // @ts-expect-error
    self.provideSomeLayer(layer)
}
