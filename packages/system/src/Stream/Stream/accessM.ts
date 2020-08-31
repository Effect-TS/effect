import type { Effect } from "../_internal/effect"
import type { Stream } from "./definitions"
import { environment } from "./environment"
import { mapM } from "./mapM"

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessM<S, R, E, A>(
  f: (r: R) => Effect<S, R, E, A>
): Stream<S, R, E, A> {
  return mapM(f)(environment<R>())
}
