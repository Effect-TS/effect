import type { Has, Tag } from "../../../data/Has"
import type { Managed } from "../definition"
import { serviceWithManaged } from "./serviceWithManaged"
import { succeedNow } from "./succeedNow"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 */
export function service<T>(_: Tag<T>, __trace?: string): Managed<Has<T>, never, T> {
  return serviceWithManaged(_)(succeedNow, __trace)
}
