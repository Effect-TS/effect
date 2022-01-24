import type { Has, Tag } from "../../../data/Has"
import { service as managedService } from "../../Managed"
import type { Layer } from "../definition"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Constructs a layer that accesses and returns the specified service from the
 * environment.
 */
export function service<T>(_: Tag<T>): Layer<Has<T>, never, T> {
  return fromRawManaged(managedService(_))
}
