import type { Has, Tag } from "../../../data/Has"
import { Layer } from "../../Layer"
import type { Effect } from "../definition"

/**
 * Constructs a layer from this effect.
 *
 * @tsplus fluent ets/Effect toLayer
 */
export function toLayer_<R, E, A>(
  self: Effect<R, E, A>,
  tag: Tag<A>
): Layer<R, E, Has<A>> {
  return Layer.fromEffect(tag)(self)
}

/**
 * Constructs a layer from this effect.
 *
 * @ets_data_first toLayer_
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(self: Effect<R, E, A>): Layer<R, E, Has<A>> => self.toLayer(tag)
}
