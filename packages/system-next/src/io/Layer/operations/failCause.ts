import { failCause as managedFailCause } from "../../Managed/operations/failCause"
import type { Cause } from "../../Cause"
import type { Layer } from "../definition"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Constructs a layer that fails with the specified cause.
 */
export function failCause<E>(cause: Cause<E>): Layer<unknown, E, never> {
  return fromRawManaged(managedFailCause(cause))
}
