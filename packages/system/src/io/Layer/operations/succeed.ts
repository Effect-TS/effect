import type { LazyArg } from "../../../data/Function"
import { Managed } from "../../Managed"
import { Layer } from "../definition"

/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static ets/LayerOps succeed
 */
export function succeed<T>(resource: LazyArg<T>): Layer<unknown, never, T> {
  return Layer.fromRawManaged(Managed.succeed(resource))
}
