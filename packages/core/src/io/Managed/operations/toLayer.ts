import type { Has, Tag } from "../../../data/Has"
import { Layer } from "../../Layer/definition"
import type { Managed } from "../definition"

/**
 * Constructs a layer from this managed resource.
 *
 * @tsplus fluent ets/Managed toLayer
 */
export function toLayer_<R, E, A>(
  self: Managed<R, E, A>,
  tag: Tag<A>,
  __tsplusTrace?: string
): Layer<R, E, Has<A>> {
  return Layer.fromManaged(tag)(self)
}

/**
 * Constructs a layer from this effect.
 *
 * @ets_data_first toLayer_
 */
export function toLayer<A>(tag: Tag<A>, __tsplusTrace?: string) {
  return <R, E>(self: Managed<R, E, A>): Layer<R, E, Has<A>> => self.toLayer(tag)
}
