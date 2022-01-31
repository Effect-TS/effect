// ets_tracing: off

import type * as T from "../../../Effect/index.js"
import * as CH from "../Channel/index.js"
import * as C from "./core.js"

/**
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, Z>(
  b: T.Effect<R, E, Z>
): C.Sink<R, unknown, unknown, E, unknown, Z> {
  return new C.Sink(CH.fromEffect(b))
}
