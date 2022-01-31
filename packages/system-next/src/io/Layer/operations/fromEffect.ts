import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../../Effect"
import { Managed } from "../../Managed"
import type { Layer } from "../definition"
import { ILayerManaged } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static ets/LayerOps fromEffect
 */
export function fromEffect<R, E, T>(_: Tag<T>) {
  return (resource: Effect<R, E, T>): Layer<R, E, Has<T>> => {
    return new ILayerManaged(
      Managed.fromEffect(resource).flatMap((a) => environmentFor(_, a))
    ).setKey(_.key)
  }
}
