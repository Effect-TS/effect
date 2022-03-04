import type { Has, Tag } from "../../../data/Has"
import { STM } from "../definition"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/STMOps service
 */
export function service<T>(tag: Tag<T>): STM<Has<T>, never, T> {
  return STM.environmentWith((r) => tag.read(r))
}
