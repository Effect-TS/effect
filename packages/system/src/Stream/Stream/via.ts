// ets_tracing: off

import type { Stream } from "./definitions.js"

/**
 * Threads the stream through the transformation function `f`.
 */
export function via<R, R2, E, E2, O, O2>(
  self: Stream<R, E, O>,
  f: (s: Stream<R, E, O>) => Stream<R2, E2, O2>
): Stream<R2, E2, O2> {
  return f(self)
}
