import { Managed } from "../../Managed"
import { Layer } from "../definition"

/**
 * Constructs a `Layer` that passes along the specified environment as an
 * output.
 *
 * @tsplus static ets/LayerOps environment
 */
export function environment<R>(): Layer<R, never, R> {
  return Layer.fromRawManaged(Managed.environment<R>())
}
