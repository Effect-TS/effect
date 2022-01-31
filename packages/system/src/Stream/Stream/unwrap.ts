// ets_tracing: off

import type { Effect } from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { flatten } from "./flatten.js"
import { fromEffect } from "./fromEffect.js"

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R, E, A>(fa: Effect<R, E, Stream<R, E, A>>): Stream<R, E, A> {
  return flatten(fromEffect(fa))
}
