import type { Effect } from "../_internal/effect"
import type { Stream } from "./definitions"
import { environment } from "./environment"
import { mapM } from "./mapM"

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessM<R, E, A>(f: (r: R) => Effect<R, E, A>): Stream<R, E, A> {
  return mapM(f)(environment<R>())
}
