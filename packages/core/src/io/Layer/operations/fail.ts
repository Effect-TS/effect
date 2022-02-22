import { Cause } from "../../Cause/definition"
import { Layer } from "../definition"

/**
 * Constructs a layer that fails with the specified error.
 *
 * @tsplus static ets/LayerOps fail
 */
export function fail<E>(e: E): Layer<unknown, E, never> {
  return Layer.failCause(Cause.fail(e))
}
