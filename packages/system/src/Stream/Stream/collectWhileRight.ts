import * as E from "../../Either"
import * as O from "../../Option"
import { collectWhile_ } from "./collectWhile"
import type { Stream } from "./definitions"

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, O1, L1>(
  self: Stream<R, E, E.Either<L1, O1>>
): Stream<R, E, O1> {
  return collectWhile_(
    self,
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}
