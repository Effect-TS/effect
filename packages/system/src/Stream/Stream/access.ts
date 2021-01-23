import type { RIO } from "./definitions"
import { environment } from "./environment"
import { map_ } from "./map"

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A): RIO<R, A> {
  return map_(environment<R>(), f)
}
