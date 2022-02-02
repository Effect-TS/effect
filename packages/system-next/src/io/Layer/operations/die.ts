import { Cause } from "../../Cause/definition"
import { Layer } from "../definition"

/**
 * Constructs a layer that dies with the specified throwable.
 *
 * @tsplus static ets/LayerOps die
 */
export function die(defect: unknown): Layer<unknown, never, never> {
  return Layer.failCause(Cause.die(defect))
}
