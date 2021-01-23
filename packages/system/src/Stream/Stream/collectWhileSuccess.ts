import * as Ex from "../../Exit"
import * as O from "../../Option"
import { collectWhileMap_ } from "./collectWhileMap"
import type { Stream } from "./definitions"

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
