// ets_tracing: off

import * as T from "../../../../Effect"
import type * as C from "../core"
import * as FromEffect from "./fromEffect"

/**
 * The stream that dies with an exception described by `msg`.
 */
export function dieMessage(msg: string): C.UIO<never> {
  return FromEffect.fromEffect(T.dieMessage(msg))
}
