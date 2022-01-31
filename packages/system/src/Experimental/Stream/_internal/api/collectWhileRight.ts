// ets_tracing: off

import * as E from "../../../../Either/index.js"
import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as CollectWhile from "./collectWhile.js"

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, A1, L1>(
  self: C.Stream<R, E, E.Either<L1, A1>>
): C.Stream<R, E, A1> {
  return CollectWhile.collectWhile_(
    self,
    E.fold(
      () => O.none,
      (r) => O.some(r)
    )
  )
}
