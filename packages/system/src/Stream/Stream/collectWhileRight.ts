// ets_tracing: off

import * as E from "../../Either/index.js"
import * as O from "../../Option/index.js"
import { collectWhileMap_ } from "./collectWhileMap.js"
import type { Stream } from "./definitions.js"

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, O1, L1>(
  self: Stream<R, E, E.Either<L1, O1>>
): Stream<R, E, O1> {
  return collectWhileMap_(
    self,
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}
