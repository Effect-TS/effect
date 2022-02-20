import type { Has, Tag } from "../../../data/Has"
import { Effect } from "../definition"
import { succeedNow } from "./succeedNow"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/EffectOps service
 */
export function service<T>(tag: Tag<T>, __etsTrace?: string): Effect<Has<T>, never, T> {
  return Effect.serviceWithEffect(tag)(succeedNow)
}
