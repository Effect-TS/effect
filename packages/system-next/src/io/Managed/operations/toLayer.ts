import type { Has, Tag } from "../../../data/Has"
import type { Layer } from "../../Layer/definition"
import { fromManaged } from "../../Layer/operations/fromManaged"
import type { Managed } from "../definition"

/**
 * Constructs a layer from this effect.
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(effect: Managed<R, E, A>): Layer<R, E, Has<A>> =>
    fromManaged(tag)(effect)
}
