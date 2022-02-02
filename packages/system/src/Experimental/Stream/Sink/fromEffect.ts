// ets_tracing: off

import type * as T from "../../../Effect"
import * as CH from "../Channel"
import * as C from "./core"

/**
 * Creates a single-value sink produced from an effect
 */
export function fromEffect<R, E, Z>(
  b: T.Effect<R, E, Z>
): C.Sink<R, unknown, unknown, E, unknown, Z> {
  return new C.Sink(CH.fromEffect(b))
}
