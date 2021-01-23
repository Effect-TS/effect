import type { Has, Tag } from "../Has"
import * as L from "../Layer"
import type { Effect } from "./effect"

/**
 * Constructs a layer from this effect.
 */
export function toLayerRaw<R, E, A>(effect: Effect<R, E, A>): L.Layer<R, E, A> {
  return L.fromRawEffect(effect)
}

/**
 * Constructs a layer from this effect.
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(effect: Effect<R, E, A>): L.Layer<R, E, Has<A>> =>
    L.fromEffect(tag)(effect)
}
