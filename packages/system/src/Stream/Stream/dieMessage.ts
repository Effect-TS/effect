// ets_tracing: off

import * as T from "../_internal/effect.js"
import { fromEffect } from "./fromEffect.js"

/**
 * The stream that dies with an exception described by `msg`.
 */
export function dieMessage(msg: string) {
  fromEffect(T.dieMessage(msg))
}
