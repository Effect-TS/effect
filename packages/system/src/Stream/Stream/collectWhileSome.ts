// ets_tracing: off

import { identity } from "../../Function/index.js"
import type * as O from "../../Option/index.js"
import { collectWhileMap_ } from "./collectWhileMap.js"
import type { Stream } from "./definitions.js"

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, O1>(
  self: Stream<R, E, O.Option<O1>>
): Stream<R, E, O1> {
  return collectWhileMap_(self, identity)
}
