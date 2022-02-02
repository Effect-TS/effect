// ets_tracing: off

import type * as C from "../core"
import * as Environment from "./environment"
import * as Map from "./map"

/**
 * Accesses the environment of the stream.
 */
export function access<R, A>(f: (r: R) => A): C.RIO<R, A> {
  return Map.map_(Environment.environment<R>(), f)
}
