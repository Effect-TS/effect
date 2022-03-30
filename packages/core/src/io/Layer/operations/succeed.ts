import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Layer } from "../definition"

/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static ets/LayerOps succeed
 */
export function succeed<T>(resource: LazyArg<T>): Layer<unknown, never, T> {
  return Layer.fromRawEffect(Effect.succeed(resource))
}
