import type { Has, Tag } from "../../../data/Has"
import type { Effect } from "../../Effect"
import type { Layer } from "../definition"
import { ILayerScoped } from "../definition"
import { environmentFor } from "./_internal/environmentFor"

/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static ets/LayerOps fromEffect
 */
export function fromEffect<T>(_: Tag<T>) {
  return <R, E>(effect: Effect<R, E, T>): Layer<R, E, Has<T>> => {
    return new ILayerScoped(effect.flatMap((a) => environmentFor(_, a))).setKey(_.key)
  }
}
