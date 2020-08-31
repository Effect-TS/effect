import { chain } from "./chain"
import type { Stream } from "./definitions"
import { environment } from "./environment"

export function accessStream<S, R, E, A>(
  f: (r: R) => Stream<S, R, E, A>
): Stream<S, R, E, A> {
  return chain(f)(environment<R>())
}
