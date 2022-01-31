// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as Effect from "./effect.js"
import * as Flatten from "./flatten.js"

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R0, E0, R, E, A>(
  self: T.Effect<R0, E0, C.Stream<R, E, A>>
): C.Stream<R0 & R, E0 | E, A> {
  return Flatten.flatten(Effect.effect(self))
}
