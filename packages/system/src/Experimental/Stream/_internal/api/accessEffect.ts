// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as Environment from "./environment.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Accesses the environment of the stream in the context of an effect.
 */
export function accessEffect<R, R1, E, A>(
  f: (r: R) => T.Effect<R1, E, A>
): C.Stream<R & R1, E, A> {
  return MapEffect.mapEffect_(Environment.environment<R>(), f)
}
