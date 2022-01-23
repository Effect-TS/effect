import type { Layer } from "../../Layer"
import { fromRawEffect } from "../../Layer/operations/fromRawEffect"
import type { Effect } from "../definition"

/**
 * Constructs a layer from this effect.
 *
 * @ets fluent ets/Effect toLayerRaw
 */
export function toLayerRaw<R, E, A>(effect: Effect<R, E, A>): Layer<R, E, A> {
  return fromRawEffect(effect)
}
