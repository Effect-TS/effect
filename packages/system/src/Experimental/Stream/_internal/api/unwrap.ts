// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as C from "../core"
import * as Effect from "./effect"
import * as Flatten from "./flatten"

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R0, E0, R, E, A>(
  self: T.Effect<R0, E0, C.Stream<R, E, A>>
): C.Stream<R0 & R, E0 | E, A> {
  return Flatten.flatten(Effect.effect(self))
}
