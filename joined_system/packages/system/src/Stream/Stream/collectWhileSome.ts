import { identity } from "../../Function"
import type * as O from "../../Option"
import { collectWhileMap_ } from "./collectWhileMap"
import type { Stream } from "./definitions"

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, O1>(
  self: Stream<R, E, O.Option<O1>>
): Stream<R, E, O1> {
  return collectWhileMap_(self, identity)
}
