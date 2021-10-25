// ets_tracing: off

import { identity } from "../../../../Function"
import type * as O from "../../../../Option"
import type * as C from "../core"
import * as CollectWhile from "./collectWhile"

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, A1>(
  self: C.Stream<R, E, O.Option<A1>>
): C.Stream<R, E, A1> {
  return CollectWhile.collectWhile_(self, identity)
}
