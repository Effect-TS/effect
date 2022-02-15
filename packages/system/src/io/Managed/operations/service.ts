import type { Has, Tag } from "../../../data/Has"
import { Managed } from "../definition"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/ManagedOps service
 */
export function service<T>(_: Tag<T>, __etsTrace?: string): Managed<Has<T>, never, T> {
  return Managed.serviceWithManaged(_)(Managed.succeedNow)
}
