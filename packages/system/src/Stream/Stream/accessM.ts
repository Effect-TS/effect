import type * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { environment } from "./environment"
import { mapM_ } from "./mapM"

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessM<R, E, A>(f: (r: R) => T.Effect<R, E, A>): Stream<R, E, A> {
  return mapM_(environment<R>(), f)
}
