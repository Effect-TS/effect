// ets_tracing: off

import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as CollectWhile from "./collectWhile"

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
