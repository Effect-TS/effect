// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as FromEffect from "./fromEffect.js"

/**
 * Accesses the whole environment of the stream.
 */
export function environment<R>(): C.RIO<R, R> {
  return FromEffect.fromEffect(T.environment<R>())
}
