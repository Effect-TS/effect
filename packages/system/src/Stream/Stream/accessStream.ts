import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { environment } from "./environment"

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function accessStream<R, E, A>(f: (r: R) => Stream<R, E, A>): Stream<R, E, A> {
  return chain_(environment<R>(), f)
}
