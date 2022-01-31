// ets_tracing: off

import { chain_ } from "./chain.js"
import type { Stream } from "./definitions.js"
import { environment } from "./environment.js"

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function accessStream<R, R1, E, A>(
  f: (r: R) => Stream<R1, E, A>
): Stream<R & R1, E, A> {
  return chain_(environment<R>(), f)
}
