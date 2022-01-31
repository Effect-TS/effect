// ets_tracing: off

import type { RIO } from "./definitions.js"
import { environment } from "./environment.js"
import { map_ } from "./map.js"

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A): RIO<R, A> {
  return map_(environment<R>(), f)
}
