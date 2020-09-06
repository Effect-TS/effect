import type { Effect } from "../../Effect"
import type { Stream } from "./definitions"
import { flatten } from "./flatten"
import { fromEffect } from "./fromEffect"

/**
 * Creates a stream produced from an effect
 */
export function unwrap<S, R, E, A>(
  fa: Effect<S, R, E, Stream<S, R, E, A>>
): Stream<S, R, E, A> {
  return flatten(fromEffect(fa))
}
