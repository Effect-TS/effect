// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as FromEffect from "./fromEffect.js"

/**
 * The stream that dies with an exception described by `msg`.
 */
export function dieMessage(msg: string): C.UIO<never> {
  return FromEffect.fromEffect(T.dieMessage(msg))
}
