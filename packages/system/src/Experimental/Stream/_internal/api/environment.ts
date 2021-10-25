// ets_tracing: off

import * as T from "../../../../Effect"
import type * as C from "../core"
import * as FromEffect from "./fromEffect"

/**
 * Accesses the whole environment of the stream.
 */
export function environment<R>(): C.RIO<R, R> {
  return FromEffect.fromEffect(T.environment<R>())
}
