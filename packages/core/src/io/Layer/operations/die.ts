import type { LazyArg } from "../../../data/Function"
import { Cause } from "../../Cause"
import { Layer } from "../definition"

/**
 * Constructs a layer that dies with the specified throwable.
 *
 * @tsplus static ets/LayerOps die
 */
export function die(defect: LazyArg<unknown>): Layer<unknown, never, never> {
  return Layer.failCause(Cause.die(defect()))
}
