import type { Layer } from "../../Layer/definition"
import { and_ as andLayer_ } from "../../Layer/operations/and"
import { environment as environmentLayer } from "../../Layer/operations/environment"
import type { Managed } from "../definition"
import { provideLayer_ } from "./provideLayer"

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 */
export function provideSomeLayer_<
  R1 extends Record<PropertyKey, unknown>,
  E1,
  A1,
  R,
  E,
  A extends Record<PropertyKey, unknown>
>(
  self: Managed<R1 & A, E1, A1>,
  layer: Layer<R, E, A>,
  __trace?: string
): Managed<R & R1, E | E1, A1> {
  return provideLayer_(self, andLayer_(environmentLayer<R1>(), layer), __trace)
}

/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeLayer_
 */
export function provideSomeLayer<R, E, A extends Record<PropertyKey, unknown>>(
  layer: Layer<R, E, A>,
  __trace?: string
) {
  return <R1 extends Record<PropertyKey, unknown>, E1, A1>(
    self: Managed<R1 & A, E1, A1>
  ): Managed<R & R1, E | E1, A1> =>
    provideSomeLayer_<R1, E1, A1, R, E, A>(self, layer, __trace)
}
