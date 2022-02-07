// ets_tracing: off

import * as T from "../../Effect/environment.js"
import { fromEffect } from "../fromEffect.js"

/**
 * Accesses the whole environment of the effect.
 */
export function environment<R>(__trace?: string) {
  return fromEffect(T.environment<R>(), __trace)
}
