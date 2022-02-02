// ets_tracing: off

import type * as C from "../core.js"
import * as Environment from "./environment.js"
import * as Map from "./map.js"

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A): C.RIO<R, A> {
  return Map.map_(Environment.environment<R>(), f)
}
