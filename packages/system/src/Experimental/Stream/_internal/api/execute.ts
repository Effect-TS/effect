// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as C from "../core"
import * as Drain from "./drain"
import * as FromEffect from "./fromEffect"

/**
 * Creates a stream that executes the specified effect but emits no elements.
 */
export function execute<R, E, Z>(effect: T.Effect<R, E, Z>): C.Stream<R, E, never> {
  return Drain.drain(FromEffect.fromEffect(effect))
}
