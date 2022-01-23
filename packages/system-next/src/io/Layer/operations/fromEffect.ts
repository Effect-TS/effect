import type { Has, Tag } from "../../../data/Has"
import { chain_ as chainManaged_ } from "../../Managed/operations/chain"
import { fromEffect as fromEffectManaged } from "../../Managed/operations/fromEffect"
import type { Effect } from "../../Effect"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from the specified effect.
 */
export function fromEffect_<R, E, T>(
  resource: Effect<R, E, T>,
  has: Tag<T>
): Layer<R, E, Has<T>> {
  return new ILayerManaged(
    chainManaged_(fromEffectManaged(resource), (a) => environmentFor(has, a))
  ).setKey(has.key)
}

/**
 * Constructs a layer from the specified effect.
 *
 * @ets_data_first fromEffect_
 */
export function fromEffect<T>(has: Tag<T>) {
  return <R, E>(resource: Effect<R, E, T>): Layer<R, E, Has<T>> =>
    fromEffect_(resource, has)
}
