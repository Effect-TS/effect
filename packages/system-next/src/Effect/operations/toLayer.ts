import type { Has, Tag } from "../../Has"
import type { Layer } from "../../Layer"
import { fromEffect } from "../../Layer/operations/fromEffect"
import type { Effect } from "../definition"

/**
 * Constructs a layer from this effect.
 *
 * @ets_data_first toLayer_
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(self: Effect<R, E, A>): Layer<R, E, Has<A>> => fromEffect(tag)(self)
}

/**
 * Constructs a layer from this effect.
 *
 * @ets fluent ets/Effect toLayer
 */
export function toLayer_<R, E, A>(
  effect: Effect<R, E, A>,
  tag: Tag<A>
): Layer<R, E, Has<A>> {
  return fromEffect(tag)(effect)
}
