import type * as TK from "../Take"
import type { Stream } from "./definitions"
import { flattenChunks } from "./flattenChunks"
import { flattenExitOption } from "./flattenExitOption"

export function flattenTake<R, E, E1, O1>(
  self: Stream<R, E, TK.Take<E1, O1>>
): Stream<R, E | E1, O1> {
  return flattenChunks(flattenExitOption(self))
}
