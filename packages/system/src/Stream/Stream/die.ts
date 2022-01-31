// ets_tracing: off

import * as T from "../_internal/effect.js"
import type { UIO } from "./definitions.js"
import { fromEffect } from "./fromEffect.js"

/**
 * The stream that dies with the error.
 */
export function die(e: unknown): UIO<never> {
  return fromEffect(T.die(e))
}
