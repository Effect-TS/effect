// ets_tracing: off

import type * as C from "../core.js"

/**
 * Threads the stream through the transformation function `f`.
 */
export function via_<R, R1, E, E1, A, A1>(
  self: C.Stream<R, E, A>,
  f: (a: C.Stream<R, E, A>) => C.Stream<R1, E1, A1>
): C.Stream<R1, E1, A1> {
  return f(self)
}

/**
 * Threads the stream through the transformation function `f`.
 *
 * @ets_data_first via_
 */
export function via<R, R1, E, E1, A, A1>(
  f: (a: C.Stream<R, E, A>) => C.Stream<R1, E1, A1>
) {
  return (self: C.Stream<R, E, A>) => via_(self, f)
}
