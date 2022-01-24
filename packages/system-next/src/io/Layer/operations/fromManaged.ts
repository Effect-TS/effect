import type { Has, Tag } from "../../../data/Has"
import type { Managed } from "../../Managed"
import { chain_ } from "../../Managed/operations/chain"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from a managed resource.
 */
export function fromManaged_<R, E, T>(
  resource: Managed<R, E, T>,
  has: Tag<T>
): Layer<R, E, Has<T>> {
  return new ILayerManaged(chain_(resource, (a) => environmentFor(has, a))).setKey(
    has.key
  )
}

/**
 * Constructs a layer from a managed resource.
 *
 * @ets_data_first fromManaged_
 */
export function fromManaged<T>(has: Tag<T>) {
  return <R, E>(resource: Managed<R, E, T>): Layer<R, E, Has<T>> =>
    fromManaged_(resource, has)
}
