// ets_tracing: off

import * as Ex from "../../Exit/index.js"
import * as O from "../../Option/index.js"
import { collectWhileMap_ } from "./collectWhileMap.js"
import type { Stream } from "./definitions.js"

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 */
export function collectWhileSuccess<R, E, O1, L1>(
  self: Stream<R, E, Ex.Exit<L1, O1>>
): Stream<R, E, O1> {
  return collectWhileMap_(
    self,
    Ex.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}
