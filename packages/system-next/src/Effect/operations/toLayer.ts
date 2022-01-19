import type { Has, Tag } from "../../Has"
import type { Layer } from "../../Layer"
import { fromEffect } from "../../Layer/operations/fromEffect"
import type { Effect } from "../definition"

/**
 * Constructs a layer from this effect.
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(effect: Effect<R, E, A>): Layer<R, E, Has<A>> => fromEffect(tag)(effect)
}
