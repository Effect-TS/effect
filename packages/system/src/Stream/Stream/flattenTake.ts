// ets_tracing: off

import type * as TK from "../Take/index.js"
import type { Stream } from "./definitions.js"
import { flattenChunks } from "./flattenChunks.js"
import { flattenExitOption } from "./flattenExitOption.js"

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, O1>(
  self: Stream<R, E, TK.Take<E1, O1>>
): Stream<R, E | E1, O1> {
  return flattenChunks(flattenExitOption(self))
}
