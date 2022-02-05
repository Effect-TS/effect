// ets_tracing: off

import type * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { drain } from "./drain.js"
import { fromEffect } from "./fromEffect.js"

/**
 * Creates a stream that executes the specified effect but emits no elements.
 */
export function execute<R, E, Z>(effect: T.Effect<R, E, Z>): Stream<R, E, never> {
  return drain(fromEffect(effect))
}
