// ets_tracing: off

import type { Has, Tag } from "../../Has"
import type { Effect } from "../definition"
import { serviceWithEffect } from "./serviceWithEffect"
import { succeedNow } from "./succeedNow"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 */
export function service<T>(_: Tag<T>, __trace?: string): Effect<Has<T>, never, T> {
  return serviceWithEffect(_)(succeedNow, __trace)
}
