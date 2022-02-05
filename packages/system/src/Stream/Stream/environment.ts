// ets_tracing: off

import * as T from "../_internal/effect.js"
import type { RIO } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"

/**
 * Accesses the whole environment of the stream.
 */
export function environment<R>(): RIO<R, R> {
  return fromEffect(T.environment<R>())
}
