import { succeedNow } from "../../Managed/operations/succeedNow"
import type { Layer } from "../definition"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Constructs a layer from the specified value.
 */
export function succeed<T>(resource: T): Layer<unknown, never, T> {
  return fromRawManaged(succeedNow(resource))
}
