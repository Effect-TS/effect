// ets_tracing: off

import type { Managed } from "../definition"
import type * as T from "./_internal/effect"
import { flatten } from "./flatten"
import { fromEffect } from "./fromEffect"

/**
 * Unwraps a `Managed` that is inside a `ZIO`.
 */
export function unwrap<R, E, A>(
  effect: T.Effect<R, E, Managed<R, E, A>>,
  __trace?: string
): Managed<R, E, A> {
  return flatten(fromEffect(effect))
}
