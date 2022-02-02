import type { Has, Tag } from "../../../data/Has"
import type { Managed } from "../../Managed"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from a managed resource.
 *
 * @tsplus static ets/LayerOps fromManaged
 */
export function fromManaged<T>(_: Tag<T>) {
  return <R, E>(resource: Managed<R, E, T>): Layer<R, E, Has<T>> =>
    new ILayerManaged(resource.flatMap((a) => environmentFor(_, a))).setKey(_.key)
}
