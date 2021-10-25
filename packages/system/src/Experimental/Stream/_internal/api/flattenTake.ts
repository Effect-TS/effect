// ets_tracing: off

import { pipe } from "../../../../Function"
import type * as TK from "../../Take"
import type * as C from "../core"
import * as FlattenChunks from "./flattenChunks"
import * as FlattenExitOption from "./flattenExitOption"
import * as Map from "./map"

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, A>(
  self: C.Stream<R, E, TK.Take<E1, A>>
): C.Stream<R, E | E1, A> {
  return pipe(
    self,
    Map.map((_) => _.exit),
    FlattenExitOption.flattenExitOption,
    FlattenChunks.flattenChunks
  )
}
