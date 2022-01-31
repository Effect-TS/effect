import type { Has, Tag } from "../../../data/Has"
import type { Layer } from "../../Layer/definition"
import { fromManaged_ } from "../../Layer/operations/fromManaged"
import type { Managed } from "../definition"

/**
 * Constructs a layer from this managed resource.
 *
 * @tsplus fluent ets/Managed toLayer
 */
export function toLayer_<R, E, A>(
  self: Managed<R, E, A>,
  tag: Tag<A>,
  __etsTrace?: string
): Layer<R, E, Has<A>> {
  return fromManaged_(self, tag)
}

/**
 * Constructs a layer from this effect.
 *
 * @ets_data_first toLayer_
 */
export function toLayer<A>(tag: Tag<A>, __etsTrace?: string) {
  return <R, E>(self: Managed<R, E, A>): Layer<R, E, Has<A>> => toLayer_(self, tag)
}
