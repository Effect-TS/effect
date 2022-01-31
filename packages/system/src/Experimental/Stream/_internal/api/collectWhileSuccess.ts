// ets_tracing: off

import * as Ex from "../../../../Exit/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as CollectWhile from "./collectWhile.js"

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 */
export function collectWhileSuccess<R, E, A1, L1>(
  self: C.Stream<R, E, Ex.Exit<L1, A1>>
): C.Stream<R, E, A1> {
  return CollectWhile.collectWhile_(
    self,
    Ex.fold(
      () => O.none,
      (r) => O.some(r)
    )
  )
}
