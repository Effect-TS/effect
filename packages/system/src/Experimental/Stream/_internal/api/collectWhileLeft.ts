// ets_tracing: off

import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as C from "../core"
import * as CollectWhile from "./collectWhile"

/**
 * Terminates the stream when encountering the first `Right`.
 */
export function collectWhileLeft<R, E, A1, L1>(
  self: C.Stream<R, E, E.Either<L1, A1>>
): C.Stream<R, E, L1> {
  return CollectWhile.collectWhile_(
    self,
    E.fold(
      (l) => O.some(l),
      (_) => O.none
    )
  )
}
