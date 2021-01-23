import * as E from "../../Either"
import * as O from "../../Option"
import { collectWhileMap_ } from "./collectWhileMap"
import type { Stream } from "./definitions"

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
