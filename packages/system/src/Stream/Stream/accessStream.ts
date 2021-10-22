// ets_tracing: off

import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { environment } from "./environment"

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function accessStream<R, R1, E, A>(
  f: (r: R) => Stream<R1, E, A>
): Stream<R & R1, E, A> {
  return chain_(environment<R>(), f)
}
