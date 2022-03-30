import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Constructs a layer that accesses and returns the specified service from the
 * environment.
 *
 * @tsplus static ets/LayerOps service
 */
export function service<T>(_: Tag<T>): Layer<Has<T>, never, T> {
  return Layer.fromRawEffect(Effect.service(_))
}
