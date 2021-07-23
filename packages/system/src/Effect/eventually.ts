// ets_tracing: off

import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Returns an effect that ignores errors and runs repeatedly until it eventually succeeds.
 */
export function eventually<R, E, A>(
  fa: Effect<R, E, A>,
  __trace?: string
): Effect<R, never, A> {
  return orElse_(fa, () => eventually(fa), __trace)
}
