// ets_tracing: off

import type { Has, Tag } from "../../Has"
import type { Managed } from "../../Managed"
import { ILayerManaged } from "../definition"
import type { Layer } from "../definition/base"

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged<T>(has: Tag<T>) {
  return <R, E>(managed: Managed<R, E, Has<T>>): Layer<R, E, Has<T>> =>
    new ILayerManaged(managed).setKey(has.key)
}
