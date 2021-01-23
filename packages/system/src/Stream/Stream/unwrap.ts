import type { Effect } from "../_internal/effect"
import type { Stream } from "./definitions"
import { flatten } from "./flatten"
import { fromEffect } from "./fromEffect"

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R, E, A>(fa: Effect<R, E, Stream<R, E, A>>): Stream<R, E, A> {
  return flatten(fromEffect(fa))
}
