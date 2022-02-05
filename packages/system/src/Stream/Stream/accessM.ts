// ets_tracing: off

import type * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { environment } from "./environment.js"
import { mapM_ } from "./mapM.js"

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessM<R, E, A>(f: (r: R) => T.Effect<R, E, A>): Stream<R, E, A> {
  return mapM_(environment<R>(), f)
}
