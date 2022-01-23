import type { Has, Tag } from "../../../data/Has"
import { succeedNow } from "../../Effect/operations/succeedNow"
import { chain_ } from "../../Managed/operations/chain"
import { fromEffect } from "../../Managed/operations/fromEffect"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from the specified value.
 */
export function fromValue_<T>(resource: T, has: Tag<T>): Layer<{}, never, Has<T>> {
  return new ILayerManaged(
    chain_(fromEffect(succeedNow(resource)), (a) => environmentFor(has, a))
  ).setKey(has.key)
}

/**
 * Construct a service layer from a value
 *
 * @ets_data_first fromValue_
 */
export function fromValue<T>(has: Tag<T>) {
  return (resource: T): Layer<{}, never, Has<T>> => fromValue_(resource, has)
}
