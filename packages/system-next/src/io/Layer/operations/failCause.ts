import type { Cause } from "../../Cause"
import { Managed } from "../../Managed"
import { Layer } from "../definition"

/**
 * Constructs a layer that fails with the specified cause.
 *
 * @tsplus static ets/LayerOps failCause
 */
export function failCause<E>(cause: Cause<E>): Layer<unknown, E, never> {
  return Layer.fromRawManaged(Managed.failCause(cause))
}
