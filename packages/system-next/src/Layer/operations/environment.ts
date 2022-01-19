import { environment as managedEnvironment } from "../../Managed/operations/environment"
import type { Layer } from "../definition"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Constructs a `Layer` that passes along the specified environment as an
 * output.
 */
export function environment<R>(): Layer<R, never, R> {
  return fromRawManaged(managedEnvironment<R>())
}
